"""Integration checks in a disposable, isolated SQL database; never uses DentalPracticeDb."""
import base64
import concurrent.futures
import datetime as dt
import hashlib
import hmac
import json
import os
from pathlib import Path
import struct
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / 'backend' / 'DentalPractice.API'
BASE = 'http://localhost:5145/api'


def request(path, method='GET', body=None, token=None, expected=200):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    payload = None if body is None else json.dumps(body).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(BASE + path, payload, headers, method=method), timeout=20) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
    assert status == expected, f'{method} {path}: expected {expected}, got {status}: {raw[:300]}'
    return json.loads(raw) if raw else None


def otp(key):
    secret = base64.b32decode(key + '=' * ((8 - len(key) % 8) % 8))
    digest = hmac.new(secret, struct.pack('>Q', int(time.time()) // 30), hashlib.sha1).digest()
    offset = digest[-1] & 15
    return str((struct.unpack('>I', digest[offset:offset+4])[0] & 0x7fffffff) % 1000000).zfill(6)


def sql(database, query):
    subprocess.run(['sqlcmd', '-S', 'localhost', '-E', '-C', '-b', '-d', database, '-Q', query], check=True, capture_output=True)


def main():
    database = 'DentalPortalSmoke_' + uuid.uuid4().hex
    assert database.startswith('DentalPortalSmoke_') and database[len('DentalPortalSmoke_'):].isalnum()
    with tempfile.TemporaryDirectory(prefix='dental-portal-smoke-') as temp:
        inbox = Path(temp) / 'inbox'
        env = dict(os.environ, ASPNETCORE_ENVIRONMENT='Development', ASPNETCORE_URLS='http://localhost:5145',
                   ConnectionStrings__DefaultConnection=f'Server=localhost;Database={database};Trusted_Connection=True;TrustServerCertificate=True',
                   Email__Enabled='false', Email__DevelopmentInboxPath=str(inbox), Security__RequireStaffMfa='true', Notifications__PollSeconds='5')
        with open(Path(temp) / 'api.log', 'w') as log:
            process = subprocess.Popen(['dotnet', str(API / 'bin/Debug/net8.0/DentalPractice.API.dll')], cwd=API, env=env, stdout=log, stderr=log)
            try:
                for _ in range(60):
                    if process.poll() is not None:
                        raise RuntimeError('Test API exited: ' + (Path(temp) / 'api.log').read_text()[-2000:])
                    try:
                        request('/practice')
                        break
                    except (OSError, AssertionError):
                        time.sleep(1)
                else:
                    raise RuntimeError('Test API did not start.')

                admin_login = {'email':'admin@dental.local', 'password':'ChangeMe123!'}
                admin_session = request('/auth/login', 'POST', admin_login)
                assert admin_session['mfaEnrollmentRequired']
                admin = admin_session['token']
                request('/admin/summary', token=admin, expected=403)
                setup = request('/auth/mfa/setup', 'POST', {}, admin)
                key = setup['key']; admin = setup['session']['token']
                enabled = request('/auth/mfa/enable', 'POST', {'code':otp(key)}, admin)
                request('/auth/security', token=admin, expected=401)
                request('/auth/login', 'POST', admin_login, expected=401)
                admin = request('/auth/login', 'POST', dict(admin_login, authenticatorCode=otp(key)))['token']
                request('/admin/summary', token=admin)
                recovery = enabled['recoveryCodes'][0]
                request('/auth/login', 'POST', dict(admin_login, recoveryCode=recovery))
                request('/auth/login', 'POST', dict(admin_login, recoveryCode=recovery), expected=401)
                print('PASS staff MFA enforcement, enrollment, token invalidation and one-time recovery')

                patient_body = {'firstName':'Smoke','lastName':'Patient','email':'smoke@example.invalid','phoneNumber':'0700000000','password':'SmokePass123!'}
                patient = request('/auth/register', 'POST', patient_body)['token']
                request('/portal/content', 'PUT', {}, patient, expected=403)
                request('/auth/send-verification', 'POST', {}, patient)
                mail = [json.loads(p.read_text()) for p in inbox.glob('*.json')]
                verify = next(x for x in mail if x['subject'] == 'Verify your email')
                query = urllib.parse.parse_qs(urllib.parse.urlparse(verify['body']).query)
                request('/auth/verify-email', 'POST', {'email':query['email'][0], 'token':query['token'][0]})
                assert request('/auth/security', token=patient)['emailConfirmed']
                request('/auth/forgot-password', 'POST', {'email':patient_body['email']})
                mail = [json.loads(p.read_text()) for p in inbox.glob('*.json')]
                reset = next(x for x in mail if x['subject'] == 'Reset your password')
                query = urllib.parse.parse_qs(urllib.parse.urlparse(reset['body']).query)
                request('/auth/reset-password', 'POST', {'email':patient_body['email'], 'token':query['token'][0], 'password':'ChangedPass123!'})
                request('/auth/security', token=patient, expected=401)
                patient = request('/auth/login', 'POST', {'email':patient_body['email'], 'password':'ChangedPass123!'})['token']
                print('PASS email verification, password reset and old-session rejection')

                content = request('/portal/content')
                content.update(changeDeadlineHours=168, faqs='Test FAQ\nTest answer')
                request('/portal/content', 'PUT', content, admin)
                assert request('/portal/content')['faqs'] == content['faqs']
                service = request('/services')[0]['serviceId']
                dentist = request('/dentists')[0]['dentistId']
                today = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=2)).date()
                slots = []
                for offset in range(1, 7):
                    date = (today + dt.timedelta(days=offset)).isoformat()
                    slots = request(f'/availability?dentistId={dentist}&serviceId={service}&date={date}')
                    if len(slots) >= 2:
                        break
                assert slots, 'No seeded slots available.'
                booking = {'dentistId':dentist,'serviceId':service,'startDateTime':slots[0]['startDateTime'],'paymentMethod':'CASH_AT_PRACTICE'}
                # Competing patient requests share the same transactional availability.
                failures = []
                def compete():
                    try:
                        return request('/appointments', 'POST', booking, patient, expected=201)
                    except AssertionError as error:
                        assert 'got 400' in str(error) or 'got 409' in str(error), str(error)
                        failures.append(str(error))
                        return None
                with concurrent.futures.ThreadPoolExecutor(2) as pool:
                    results = list(pool.map(lambda _: compete(), range(2)))
                assert sum(x is not None for x in results) == 1, failures
                appointment = next(x for x in results if x)['appointment']
                ident = appointment['appointmentId']
                request(f'/appointments/{ident}/cancel', 'PUT', {'reason':'Late change test'}, patient, expected=400)
                request(f'/staff/appointments/{ident}/reschedule', 'PUT', {'newStartDateTime':slots[1]['startDateTime']}, admin, expected=204)
                for view in ('day','week','month'):
                    assert any(x['appointmentId'] == ident for x in request(f'/staff/appointments?date={date}&view={view}', token=admin))
                assert request('/portal/patients?q=Smoke', token=admin)
                request(f'/staff/appointments/{ident}/payments/cash', 'POST', {'amount':100}, admin, expected=204)
                receipt = request(f'/portal/receipts/{ident}', token=patient)
                assert receipt['payments'][0]['amount'] == 100
                request(f'/portal/refunds/{ident}', 'POST', {'amount':101,'reason':'Test','externalReference':'test-refund'}, admin, expected=400)
                request(f'/portal/refunds/{ident}', 'POST', {'amount':40,'reason':'Test','externalReference':'test-refund'}, admin)
                request(f'/staff/appointments/{ident}/payments/cash', 'POST', {'amount':100}, admin, expected=400)
                request(f'/portal/refunds/{ident}', 'POST', {'amount':40,'reason':'Test','externalReference':'test-refund'}, admin, expected=409)
                assert request(f'/portal/receipts/{ident}', token=patient)['refunds'][0]['amount'] == 40
                stranger = request('/auth/register', 'POST', dict(patient_body, email='stranger@example.invalid'))['token']
                request(f'/portal/receipts/{ident}', token=stranger, expected=404)
                report = request(f'/portal/reports?from={today.isoformat()}&to={date}', token=admin)
                assert report['collected'] == 100 and report['refunded'] == 40
                print('PASS content access, shared-slot concurrency, deadlines, staff rescheduling, calendar ranges, patient lookup, receipt ownership and refund limits')

                for _ in range(15):
                    mail = [json.loads(p.read_text()) for p in inbox.glob('*.json')]
                    if any(x['subject'] == 'AppointmentRescheduled' for x in mail):
                        break
                    time.sleep(1)
                else:
                    raise AssertionError('Notification worker did not deliver to development inbox.')
                print('PASS queued notification delivery to development inbox')
                backup = subprocess.run(['powershell', '-NoProfile', '-File', str(ROOT / 'backup-database.ps1'), '-Database', database, '-TestRestore'], capture_output=True, text=True)
                assert backup.returncode == 0, backup.stdout + backup.stderr
                assert 'Restore and table-read checks passed.' in backup.stdout
                print('PASS backup checksums, isolated restore and restored-table reads')
            except Exception:
                log.flush()
                print((Path(temp) / 'api.log').read_text()[-7000:])
                raise
            finally:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill(); process.wait()
                sql('master', f"IF DB_ID('{database}') IS NOT NULL BEGIN ALTER DATABASE [{database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{database}]; END")
                print('Temporary test database removed.')


if __name__ == '__main__':
    main()
