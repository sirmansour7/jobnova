import type { CvData } from "@/src/services/cv.service"

export function CreativeTemplate({ cv }: { cv: CvData }) {
  return (
    <div style={{ backgroundColor: 'white', color: '#111827', width: '100%', minHeight: '297mm', fontFamily: "'Segoe UI', Tahoma, sans-serif", direction: 'ltr' }}>
      <div style={{ display: 'flex', minHeight: '297mm' }}>
        {/* Sidebar */}
        <div style={{ width: '35%', flexShrink: 0, direction: 'rtl', backgroundColor: '#0EA5E9', color: 'white', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Avatar + Name */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', margin: '0 auto 12px' }}>
              {cv.fullName?.slice(0, 2) || "CV"}
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: '1.3', color: 'white' }}>{cv.fullName || "الاسم الكامل"}</h1>
            <p style={{ color: 'rgba(224,242,254,0.9)', fontSize: '13px', marginTop: '4px' }}>{cv.title || ""}</p>
          </div>

          {/* Contact */}
          <div>
            <h2 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(224,242,254,0.8)', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px' }}>التواصل</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>
              {cv.email && <p>✉ {cv.email}</p>}
              {cv.phone && <p>📞 {cv.phone}</p>}
              {cv.location && <p>📍 {cv.location}</p>}
            </div>
          </div>

          {/* Skills */}
          {cv.skills.length > 0 && (
            <div>
              <h2 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(224,242,254,0.8)', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px' }}>المهارات</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {cv.skills.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: '24px', direction: 'rtl', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {cv.summary && (
            <div>
              <h2 style={{ fontSize: '12px', fontWeight: 'bold', color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', borderBottom: '1px solid #E0F2FE', paddingBottom: '4px' }}>الملخص</h2>
              <p style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.7' }}>{cv.summary}</p>
            </div>
          )}

          {cv.experience.length > 0 && (
            <div>
              <h2 style={{ fontSize: '12px', fontWeight: 'bold', color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', borderBottom: '1px solid #E0F2FE', paddingBottom: '4px' }}>الخبرة</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {cv.experience.map((e, i) => (
                  <div key={i} style={{ borderRight: '2px solid #BAE6FD', paddingRight: '16px' }}>
                    <p style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{e.title}</p>
                    <p style={{ color: '#0EA5E9', fontSize: '12px' }}>{e.company} · {e.from}{e.to ? ` – ${e.to}` : ""}</p>
                    {e.description && <p style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px', lineHeight: '1.6' }}>{e.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {cv.education.length > 0 && (
            <div>
              <h2 style={{ fontSize: '12px', fontWeight: 'bold', color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', borderBottom: '1px solid #E0F2FE', paddingBottom: '4px' }}>التعليم</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cv.education.map((e, i) => (
                  <div key={i}>
                    <p style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{e.degree}</p>
                    <p style={{ fontSize: '12px', color: '#6B7280' }}>{e.institution} · {e.year}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
