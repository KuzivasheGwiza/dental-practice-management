const tooth =
  "M99 42C118 27 132 48 151 46C173 43 178 25 198 44C223 64 196 89 194 122C189 164 173 176 168 139C164 118 146 116 137 140C125 179 108 161 105 124C103 91 73 66 99 42Z";
export function ServiceVisual({
  kind,
  title,
  large = false,
}: {
  kind: string;
  title: string;
  large?: boolean;
}) {
  const palette: { [key: string]: string } = {
    cleaning: "#edf5ec",
    root: "#eef1fa",
    implant: "#f3eee8",
    urgent: "#fbeee9",
    child: "#fff3d9",
    whitening: "#edf5fa",
    aligner: "#f4eef8",
  };
  const labels: { [key: string]: [string, string] } = {
    exam: ["Dental assessment", "Consultation"],
    cleaning: ["Plaque & tartar", "Professional care"],
    filling: ["Cavity", "Restoration"],
    root: ["Tooth crown", "Root canals"],
    extraction: ["Tooth assessment", "Planned removal"],
    wisdom: ["Wisdom tooth", "Neighbouring teeth"],
    crown: ["Crown", "Supporting tooth"],
    denture: ["Partial denture", "Complete denture"],
    implant: ["Replacement tooth", "Connector & implant"],
    whitening: ["Shade assessment", "Professional whitening"],
    veneer: ["Veneer shell", "Composite bonding"],
    aligner: ["Fixed braces", "Removable aligner"],
    gum: ["Gum line", "Professional assessment"],
    child: ["Little smiles", "Friendly check-up"],
    urgent: ["Dental concern", "Urgent assessment"],
  };
  const text = labels[kind] ?? labels.exam;
  if (kind === "exam")
    return (
      <div className={`service-visual photo ${large ? "large" : ""}`}>
        <img
          src="/images/dental-consultation.jpg"
          alt="Stock photograph of a dental examination using a mirror"
          loading="lazy"
        />
        <span className="asset-label">Stock image · sample visual</span>
      </div>
    );
  if (kind === "aligner")
    return (
      <div className={`service-visual photo ${large ? "large" : ""}`}>
        <img
          src="/images/dental-care.jpg"
          alt="Stock photograph showing a removable clear aligner"
          loading="lazy"
        />
        <span className="asset-label">Stock image · sample visual</span>
      </div>
    );
  return (
    <div
      className={`service-visual ${large ? "large" : ""}`}
      style={{ background: palette[kind] ?? "#eaf4f2" }}
    >
      <svg
        viewBox="0 0 300 200"
        role="img"
        aria-label={`${title}: labelled demonstration illustration awaiting dental review`}
      >
        <circle cx="150" cy="99" r="77" fill="white" opacity=".6" />
        {kind === "denture" ? (
          <>
            <path
              d="M85 120 Q150 35 215 120"
              stroke="#e9afa8"
              strokeWidth="22"
              fill="none"
            />
            {[95, 118, 142, 166, 190, 210].map((x, i) => (
              <rect
                key={x}
                x={x - 9}
                y={83 + Math.abs(i - 2.5) * 9}
                width="18"
                height="26"
                rx="5"
                fill="white"
                stroke="#7eaaa3"
                strokeWidth="2"
              />
            ))}
          </>
        ) : (
          <>
            <path d={tooth} fill="white" stroke="#5c9790" strokeWidth="3" />
            {["root", "implant"].includes(kind) && (
              <path
                d="M142 57Q160 82 147 148 M161 58Q170 90 175 149"
                stroke={kind === "root" ? "#e6a798" : "#9cb4bf"}
                strokeWidth={kind === "root" ? 9 : 12}
                fill="none"
              />
            )}
            {kind === "filling" && (
              <>
                <path d="M134 45l13 28 20-26" fill="#d6af85" />
                <path d="M154 47l12 17 14-18" fill="#b1d8d4" />
              </>
            )}
            {kind === "implant" && (
              <>
                <path d="M135 96h43v17h-43z" fill="#89a8ad" />
                {[115, 123, 131, 139, 147].map((y) => (
                  <path
                    key={y}
                    d={`M144 ${y}h26`}
                    stroke="#657e89"
                    strokeWidth="2"
                  />
                ))}
              </>
            )}
            {["gum", "cleaning"].includes(kind) && (
              <>
                <path
                  d="M84 107Q151 93 216 107v16Q150 109 84 123Z"
                  fill="#e5a4a0"
                />
                {kind === "cleaning" && (
                  <path
                    d="M105 99l21-3m45 0 20 3"
                    stroke="#d1b16e"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                )}
              </>
            )}
            {kind === "crown" && (
              <path
                d="M97 45Q123 29 149 46Q182 32 200 46l-4 37H103Z"
                fill="#d6bc83"
                stroke="#ac956c"
                strokeWidth="2"
              />
            )}
            {kind === "veneer" && (
              <path
                d="M98 45Q120 30 138 45L126 115Q108 109 103 82Z"
                fill="#b9dbd6"
              />
            )}
            {kind === "wisdom" && (
              <path
                d="M203 86q23-8 25 14l-14 27-20-21Z"
                fill="#d4e4df"
                stroke="#5c9790"
                strokeWidth="2"
              />
            )}
            {kind === "urgent" && (
              <>
                <circle cx="196" cy="119" r="23" fill="#c2664d" />
                <path
                  d="M196 107v24m-12-12h24"
                  stroke="white"
                  strokeWidth="4"
                />
              </>
            )}
            {["child", "whitening"].includes(kind) && (
              <>
                <path
                  d="M209 52v22m-11-11h22M81 113v16m-8-8h16"
                  stroke="#d4ae55"
                  strokeWidth="3"
                />
                <path
                  d="M130 86q20 18 38 0"
                  fill="none"
                  stroke="#5c9790"
                  strokeWidth="3"
                />
              </>
            )}
            {kind === "extraction" && (
              <path
                d="M146 34v-14m-8 7 8-8 8 8"
                stroke="#5c9790"
                strokeWidth="3"
                fill="none"
              />
            )}
          </>
        )}
        <path d="M53 58h43M201 130h46" stroke="#7da29c" strokeWidth="1.5" />
        <text x="12" y="49" fontSize="10" fill="#28544f">
          {text[0]}
        </text>
        <text x="195" y="148" fontSize="10" fill="#28544f">
          {text[1]}
        </text>
      </svg>
      <span className="asset-label">
        Illustration · awaiting practice review
      </span>
    </div>
  );
}
