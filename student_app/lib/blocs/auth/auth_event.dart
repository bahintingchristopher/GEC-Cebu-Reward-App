import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class CheckAuthStatus extends AuthEvent {}

class AuthLoginRequested extends AuthEvent {
  final String username;
  final String password;
  const AuthLoginRequested(this.username, this.password);

  @override
  List<Object?> get props => [username, password];
}

class AuthRegisterRequested extends AuthEvent {
  final String username;
  final String password;
  final String fullName;
  final String email;
  final String? userId;
  const AuthRegisterRequested({
    required this.username,
    required this.password,
    required this.fullName,
    required this.email,
    this.userId,
  });

  @override
  List<Object?> get props => [username, password, fullName, email, userId];
}

class AuthLogoutRequested extends AuthEvent {}
