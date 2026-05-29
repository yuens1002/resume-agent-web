import { QRCodeSVG } from 'qrcode.react'

/*
 * Client-side QR (no third-party image service). Encodes the site URL so a phone
 * scan opens the chat on mobile. Themed to the warm-paper palette.
 */
export function QrCode({ data, size = 92 }: { data: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        padding: 7,
        borderRadius: 12,
        background: '#fff',
        border: '1px solid var(--hair-2)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
      }}
    >
      <QRCodeSVG
        value={data}
        size={size - 14}
        bgColor="#ffffff"
        fgColor="#262420"
        level="M"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
