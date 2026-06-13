import React from "react";

export default function HrAvatar2D({ isSpeaking }) {
  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full max-h-[360px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Hair Gradient */}
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Skin Gradient */}
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff1f2" />
            <stop offset="40%" stopColor="#ffe4e6" />
            <stop offset="100%" stopColor="#fecdd3" />
          </linearGradient>
          
          {/* Skin Shadow Gradient */}
          <linearGradient id="skinShadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fda4af" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
          </linearGradient>

          {/* Blazer Gradient */}
          <linearGradient id="blazerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>

          {/* Lapel Gradient */}
          <linearGradient id="lapelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#115e59" />
          </linearGradient>

          {/* Shirt Gradient */}
          <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>

          {/* Desk Gradient */}
          <linearGradient id="deskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>

        {/* Solid white background */}
        <rect width="400" height="400" fill="#ffffff" />

        {/* Character Group */}
        <g className="avatar-character">
          {/* Back Hair (Shadowed) */}
          <path
            d="M125 160 C125 70, 275 70, 275 160 C275 220, 260 255, 260 280 L140 280 C140 255, 125 220, 125 160 Z"
            fill="url(#hairGrad)"
          />

          {/* Torso Group (Breaths naturally) */}
          <g className="avatar-body">
            {/* Neck */}
            <path
              d="M185 220 L215 220 L212 265 L188 265 Z"
              fill="url(#skinGrad)"
            />
            {/* Neck Shadow under chin */}
            <path
              d="M185 220 C195 238, 205 238, 215 220 L212 232 C204 246, 196 246, 188 232 Z"
              fill="url(#skinShadowGrad)"
            />

            {/* Shoulders base (Teal Blazer) */}
            <path
              d="M90 400 C90 320, 130 255, 175 255 L225 255 C270 255, 310 320, 310 400 Z"
              fill="url(#blazerGrad)"
            />

            {/* White Shirt Collar */}
            <path
              d="M170 255 L230 255 L200 295 Z"
              fill="url(#shirtGrad)"
            />
            {/* V-neck skin area */}
            <path
              d="M188 255 L212 255 L200 272 Z"
              fill="url(#skinGrad)"
            />

            {/* Professional Lanyard / ID Card Badge */}
            {/* Strap */}
            <path
              d="M188 255 L198 288 L200 288 L188 255 Z"
              fill="#475569"
            />
            <path
              d="M212 255 L202 288 L200 288 L212 255 Z"
              fill="#475569"
            />
            {/* Badge Holder clip */}
            <rect x="198" y="288" width="4" height="4" fill="#64748b" rx="1" />
            {/* ID Badge Card */}
            <rect x="189" y="292" width="22" height="28" fill="#ffffff" rx="2" stroke="#cbd5e1" strokeWidth="1" />
            <rect x="189" y="292" width="22" height="6" fill="#0d9488" rx="1" />
            <circle cx="200" cy="303" r="3" fill="#64748b" />
            <line x1="192" y1="310" x2="208" y2="310" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="192" y1="314" x2="204" y2="314" stroke="#cbd5e1" strokeWidth="1" />

            {/* Left Blazer Lapel */}
            <path
              d="M175 255 L198 335 L160 325 Z"
              fill="url(#lapelGrad)"
            />

            {/* Right Blazer Lapel */}
            <path
              d="M225 255 L202 335 L240 325 Z"
              fill="url(#lapelGrad)"
            />

            {/* Pocket Square details */}
            <path
              d="M135 320 L155 315 L150 310 Z"
              fill="#ffe4e6"
            />
            <line x1="130" y1="322" x2="160" y2="317" stroke="#0b7a70" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* Head & Face Group (Bobs and tilts when speaking) */}
          <g className={`avatar-head ${isSpeaking ? "avatar-head-speaking" : "avatar-head-idle"}`}>
            {/* Ears */}
            <circle cx="138" cy="165" r="10" fill="url(#skinGrad)" />
            <circle cx="262" cy="165" r="10" fill="url(#skinGrad)" />

            {/* Face Shape */}
            <ellipse cx="200" cy="165" rx="55" ry="60" fill="url(#skinGrad)" />

            {/* Front Hair / Bangs with layering */}
            <path
              d="M138 150 C138 90, 262 90, 262 150 C248 115, 222 110, 200 125 C178 110, 152 115, 138 150 Z"
              fill="url(#hairGrad)"
            />
            {/* Hair highlight lock */}
            <path
              d="M170 120 C185 105, 220 105, 230 122 C210 115, 185 115, 170 120 Z"
              fill="#475569"
              opacity="0.3"
            />

            {/* Blushing Cheeks */}
            <circle cx="160" cy="178" r="9" fill="#f43f5e" opacity="0.18" />
            <circle cx="240" cy="178" r="9" fill="#f43f5e" opacity="0.18" />

            {/* Eyebrows */}
            <path
              d="M162 141 Q176 132 190 141"
              stroke="#0f172a"
              strokeWidth="3.2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M210 141 Q224 132 238 141"
              stroke="#0f172a"
              strokeWidth="3.2"
              fill="none"
              strokeLinecap="round"
            />

            {/* Eyes Group (Blinks automatically via CSS) */}
            <g className="avatar-eyes">
              {/* Left Eye */}
              <ellipse cx="177" cy="151" rx="8" ry="5.5" fill="#ffffff" />
              <circle cx="177" cy="151" r="4.5" fill="#0f172a" />
              <circle cx="175.5" cy="149" r="1.5" fill="#ffffff" />
              {/* Eyelash line */}
              <path d="M168 149 Q177 143 186 149" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />

              {/* Right Eye */}
              <ellipse cx="223" cy="151" rx="8" ry="5.5" fill="#ffffff" />
              <circle cx="223" cy="151" r="4.5" fill="#0f172a" />
              <circle cx="221.5" cy="149" r="1.5" fill="#ffffff" />
              {/* Eyelash line */}
              <path d="M214 149 Q223 143 232 149" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>

            {/* Nose */}
            <path
              d="M200 159 Q203 174 197 176"
              stroke="#fda4af"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* Mouth */}
            <g className="avatar-mouth">
              {isSpeaking ? (
                /* Open mouth path - animated scale */
                <path
                  d="M188 185 Q200 205 212 185 Z"
                  fill="#e11d48"
                  className="avatar-mouth-talking"
                />
              ) : (
                /* Smiling mouth path */
                <path
                  d="M187 187 Q200 198 213 187"
                  stroke="#e11d48"
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                />
              )}
            </g>
          </g>

          {/* Premium Office Desk Surface at the bottom */}
          <g className="avatar-desk">
            {/* Desk wood board */}
            <rect x="0" y="375" width="400" height="25" fill="url(#deskGrad)" />
            {/* Desk dark shadow line */}
            <rect x="0" y="373" width="400" height="2" fill="#cbd5e1" />
            
            {/* Coffee Mug on the Desk */}
            <path
              d="M75 360 L90 360 L87 382 L78 382 Z"
              fill="#06b6d4"
            />
            {/* Coffee Mug Handle */}
            <path
              d="M90 365 C93 365, 93 375, 90 375"
              stroke="#06b6d4"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Subtle steam lines from coffee */}
            <path
              d="M80 355 Q82 350 80 346"
              stroke="#e2e8f0"
              strokeWidth="1.2"
              fill="none"
              opacity="0.8"
            />
            <path
              d="M85 356 Q87 351 85 347"
              stroke="#e2e8f0"
              strokeWidth="1.2"
              fill="none"
              opacity="0.8"
            />

            {/* Sleek Tablet on the Right desk side */}
            <polygon
              points="305,370 338,367 348,382 312,385"
              fill="#1e293b"
            />
            <polygon
              points="308,371 335,369 344,381 314,383"
              fill="#ffffff"
            />
          </g>

          {/* Rested Left Hand (Rests naturally on the desk) */}
          <g className="avatar-hand-left">
            <path
              d="M100 380 C105 360, 130 360, 135 380 Z"
              fill="url(#skinGrad)"
            />
          </g>

          {/* Gesturing Right Hand (Animated when speaking, raises above the desk) */}
          <g className={`avatar-hand-right ${isSpeaking ? "avatar-hand-speaking" : "avatar-hand-idle"}`}>
            <path
              d="M295 380 C290 355, 265 355, 255 380 Z"
              fill="url(#skinGrad)"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
