export function renderMascotSVG(mood = 'happy', type = 'dragon', size = 96) {
  const eyeY = mood === 'sad' ? 46 : 43;
  const mouth =
    mood === 'excited'
      ? '<path d="M40 58 Q50 70 60 58 Z" fill="#dc2626" />'
      : mood === 'sad'
      ? '<path d="M41 63 Q50 56 59 63" stroke="#1c1917" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : '<path d="M41 58 Q50 65 59 58" stroke="#1c1917" stroke-width="3" fill="none" stroke-linecap="round"/>';

  if (type === 'panda') {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-label="Linh vật Gấu Trúc">
        <circle cx="26" cy="26" r="13" fill="#1c1917"/>
        <circle cx="74" cy="26" r="13" fill="#1c1917"/>
        <circle cx="50" cy="52" r="34" fill="#ffffff" stroke="#1c1917" stroke-width="3"/>
        <ellipse cx="36" cy="45" rx="9" ry="7" transform="rotate(-15 36 45)" fill="#1c1917"/>
        <ellipse cx="64" cy="45" rx="9" ry="7" transform="rotate(15 64 45)" fill="#1c1917"/>
        <circle cx="37" cy="${eyeY}" r="3" fill="#ffffff"/>
        <circle cx="63" cy="${eyeY}" r="3" fill="#ffffff"/>
        <ellipse cx="50" cy="53" rx="5" ry="3.5" fill="#1c1917"/>
        ${mouth}
      </svg>
    `;
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-label="Linh vật Rồng Con">
      <path d="M34 25 L26 10 L38 20 Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.5"/>
      <path d="M66 25 L74 10 L62 20 Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.5"/>
      <circle cx="50" cy="52" r="35" fill="#dc2626"/>
      <ellipse cx="50" cy="54" rx="28" ry="25" fill="#fef3c7" stroke="#b91c1c" stroke-width="2.5"/>
      <circle cx="32" cy="56" r="4.5" fill="#fca5a5" opacity="0.8"/>
      <circle cx="68" cy="56" r="4.5" fill="#fca5a5" opacity="0.8"/>
      <circle cx="38" cy="${eyeY}" r="4.5" fill="#1c1917"/>
      <circle cx="62" cy="${eyeY}" r="4.5" fill="#1c1917"/>
      <circle cx="39.5" cy="${eyeY - 1.5}" r="1.5" fill="#ffffff"/>
      <circle cx="63.5" cy="${eyeY - 1.5}" r="1.5" fill="#ffffff"/>
      ${mouth}
      <circle cx="50" cy="34" r="3.5" fill="#f59e0b"/>
    </svg>
  `;
}