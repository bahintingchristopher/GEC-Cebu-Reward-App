import 'package:web/web.dart' as web;

bool redirectToAdminDashboard() {
  // Same-origin page: the admin dashboard login lives beside the student PWA.
  web.window.location.href = '/adminlogin.html';
  return true;
}
