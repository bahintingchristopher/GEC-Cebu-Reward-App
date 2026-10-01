import 'admin_redirect_stub.dart'
    if (dart.library.io) 'admin_redirect_io.dart'
    if (dart.library.js_interop) 'admin_redirect_web.dart'
    as impl;

/// Platform-neutral helper for steering an admin away from the student app.
///
/// On the web (the PWA where the "confusing landing page" problem happens) this
/// navigates the browser to the admin dashboard login. On native the student
/// app is not the admin's UI, so it reports that no redirect is possible and the
/// caller shows a message instead.
abstract class AdminRedirect {
  /// Returns true if this platform redirected to the admin dashboard.
  static bool redirect() => impl.redirectToAdminDashboard();
}
