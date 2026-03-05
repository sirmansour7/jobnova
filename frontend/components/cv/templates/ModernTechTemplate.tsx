import type { CvData } from "@/src/services/cv.service"

export function ModernTechTemplate({ cv }: { cv: CvData }) {
  return (
    <div style={{ backgroundColor: 'white', color: '#111827', width: '100%', minHeight: '297mm', padding: '32px', fontFamily: "'Segoe UI', Tahoma, sans-serif", direction: 'rtl' }}>
      {/* Header */}
      <div style={{ borderBottom: '4px solid #2563EB', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>{cv.fullName || "الاسم الكامل"}</h1>
        {cv.title && <p style={{ color: '#2563EB', fontWeight: '500', fontSize: '16px', marginTop: '4px' }}>{cv.title}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px', fontSize: '13px', color: '#4B5563' }}>
          {cv.email && <span>✉ {cv.email}</span>}
          {cv.phone && <span>📞 {cv.phone}</span>}
          {cv.location && <span>📍 {cv.location}</span>}
        </div>
      </div>

      {cv.summary && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#2563EB', marginBottom: '8px', borderBottom: '1px solid #DBEAFE', paddingBottom: '4px' }}>الملخص المهني</h2>
          <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.7' }}>{cv.summary}</p>
        </div>
      )}

      {cv.skills.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#2563EB', marginBottom: '8px', borderBottom: '1px solid #DBEAFE', paddingBottom: '4px' }}>المهارات</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {cv.skills.map(s => (
              <span key={s} style={{ borderRadius: '9999px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 12px', fontSize: '12px', color: '#1D4ED8', fontWeight: '500' }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {cv.experience.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#2563EB', marginBottom: '12px', borderBottom: '1px solid #DBEAFE', paddingBottom: '4px' }}>الخبرة العملية</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cv.experience.map((e, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{e.title}</p>
                    <p style={{ color: '#2563EB', fontSize: '13px' }}>{e.company}</p>
                  </div>
                  <span style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap', marginTop: '2px' }}>{e.from}{e.to ? ` – ${e.to}` : ""}</span>
                </div>
                {e.description && <p style={{ fontSize: '13px', color: '#4B5563', marginTop: '4px', lineHeight: '1.6' }}>{e.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {cv.education.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#2563EB', marginBottom: '12px', borderBottom: '1px solid #DBEAFE', paddingBottom: '4px' }}>التعليم</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cv.education.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{e.degree}</p>
                  <p style={{ fontSize: '13px', color: '#4B5563' }}>{e.institution}</p>
                </div>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>{e.year}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
