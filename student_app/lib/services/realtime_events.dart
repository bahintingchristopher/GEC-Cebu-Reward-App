import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../config/api_config.dart';

/// Maintains a live WebSocket connection to the backend (same LAN server as the
/// REST API) so the student's displayed points update instantly when an admin
/// scans their barcode. Keeps reconnecting while the screen is alive.
class RealtimeEvents {
  RealtimeEvents._();
  static final RealtimeEvents instance = RealtimeEvents._();

  WebSocketChannel? _channel;
  StreamController<Map<String, dynamic>>? _controller;
  StreamSubscription? _sub;
  Timer? _retryTimer;
  bool _shouldRun = false;

  bool get isConnected => _channel != null;

  /// Start listening. [token] is the student's JWT used to authenticate the socket.
  void start(String token) {
    _shouldRun = true;
    _controller ??= StreamController<Map<String, dynamic>>.broadcast();
    if (_channel != null) return;
    _connect(token);
  }

  /// Expose parsed JSON events (e.g. {type: 'points', total: ...}).
  Stream<Map<String, dynamic>> get events => _controller!.stream;

  void _connect(String token) {
    final wsUrl = 'ws://${ApiConfig.host}:${ApiConfig.port}/ws?token=$token';
    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _sub = _channel!.stream.listen(
        (data) {
          try {
            final decoded = jsonDecode(data as String) as Map<String, dynamic>;
            _controller!.add(decoded);
          } catch (_) {}
        },
        onDone: () => _handleDisconnect(token),
        onError: (_) => _handleDisconnect(token),
      );
    } catch (_) {
      _handleDisconnect(token);
    }
  }

  void _handleDisconnect(String token) {
    _sub?.cancel();
    _sub = null;
    _channel = null;
    if (!_shouldRun) return;
    _retryTimer?.cancel();
    _retryTimer = Timer(const Duration(seconds: 3), () => _connect(token));
  }

  /// Closes the connection (call when leaving the dashboard / logging out).
  void stop() {
    _shouldRun = false;
    _retryTimer?.cancel();
    _sub?.cancel();
    _sub = null;
    _channel?.sink.close();
    _channel = null;
  }

  void disposeStream() {
    stop();
    _controller?.close();
    _controller = null;
  }
}