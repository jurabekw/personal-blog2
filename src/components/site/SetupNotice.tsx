/** Shown instead of content until a database is connected (fresh deploys). */
export function SetupNotice() {
  return (
    <main id="jb-main" className="jb-main">
      <div className="jb-shell">
        <div className="jb-empty jb-setup">
          <h1 style={{ fontSize: 27.2, lineHeight: '34px' }}>Almost there</h1>
          <p className="jb-body" style={{ marginTop: 'var(--jb-space-lg)' }}>
            The site is deployed, but no database is connected yet. Add a Postgres connection string as{' '}
            <code>DATABASE_URL</code> (plus <code>AUTH_SECRET</code>, <code>ADMIN_EMAIL</code> and{' '}
            <code>ADMIN_PASSWORD</code>) in your hosting environment variables and redeploy. Then sign in at{' '}
            <a href="/admin/">/admin</a> and import your WordPress content.
          </p>
        </div>
      </div>
    </main>
  )
}
