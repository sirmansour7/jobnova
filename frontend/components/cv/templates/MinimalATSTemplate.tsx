import type { CvData } from "@/src/services/cv.service"

export function MinimalATSTemplate({ cv }: { cv: CvData }) {
  return (
    <div style={{ backgroundColor: 'white', color: '#111827', width: '100%', minHeight: '297mm', padding: '32px', fontFamily: "'Times New Roman', serif", direction: 'rtl' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #111827', paddingBottom: '16px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827' }}>{cv.fullName || "الاسم الكامل"}</h1>
        {cv.title && <p style={{ fontSize: '13px', color: '#374151', marginTop: '4px' }}>{cv.title}</p>}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#4B5563' }}>
          {cv.email && <span>{cv.email}</span>}
          {cv.phone && <span>{cv.phone}</span>}
          {cv.location && <span>{cv.location}</span>}
        </div>
      </div>

      {cv.summary && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#111827', marginBottom: '4px' }}>SUMMARY / الملخص</h2>
          <p style={{ fontSize: '12px', color: '#374151', lineHeight: '1.6' }}>{cv.summary}</p>
        </div>
      )}

      {cv.skills.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#111827', marginBottom: '4px' }}>SKILLS / المهارات</h2>
          <p style={{ fontSize: '12px', color: '#374151' }}>{cv.skills.join(' · ')}</p>
        </div>
      )}

      {cv.experience.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#111827', marginBottom: '8px' }}>EXPERIENCE / الخبرة</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cv.experience.map((e, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600', fontSize: '12px', color: '#111827' }}>{e.title} — {e.company}</span>
                  <span style={{ fontSize: '11px', color: '#6B7280' }}>{e.from}{e.to ? ` - ${e.to}` : ""}</span>
                </div>
                {e.description && <p style={{ fontSize: '12px', color: '#4B5563', marginTop: '2px' }}>{e.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {cv.education.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#111827', marginBottom: '8px' }}>EDUCATION / التعليم</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cv.education.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600', fontSize: '12px' }}>{e.degree} — {e.institution}</span>
                <span style={{ fontSize: '11px', color: '#6B7280' }}>{e.year}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
