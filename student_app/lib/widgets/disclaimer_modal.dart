import 'dart:async';
import 'package:flutter/material.dart';
import '../services/app_close.dart' as app_exit;

class DisclaimerModal extends StatefulWidget {
  const DisclaimerModal({super.key});

  @override
  State<DisclaimerModal> createState() => _DisclaimerModalState();
}

class _DisclaimerModalState extends State<DisclaimerModal> {
  bool _agreed = false;
  bool _declined = false;

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'DISCLAIMER',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFFD32F2F),
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'I understand that this app is restricted to authorized Cebu GEC users and is used to track participation in approved Cebu GEC activities. I will provide accurate information, protect other participants\u2019 information, and follow the applicable activity and reward rules. I understand that entries and points are subject to administrative verification.',
                textAlign: TextAlign.justify,
                style: TextStyle(fontSize: 14, color: Colors.black87, height: 1.4),
              ),
              const SizedBox(height: 16),
              CheckboxListTile(
                value: _agreed,
                onChanged: (value) => setState(() => _agreed = value ?? false),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                dense: true,
                title: const Text('I agree to the above.', style: TextStyle(fontSize: 14)),
              ),
              if (_declined)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    'You must agree to the disclaimer to continue.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFFD32F2F), fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: _decline,
                      style: TextButton.styleFrom(foregroundColor: const Color(0xFFD32F2F)),
                      child: const Text('DECLINE', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _agreed ? () => Navigator.of(context).pop(true) : null,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF4D49FF),
                        disabledBackgroundColor: Colors.grey.shade300,
                        disabledForegroundColor: Colors.grey.shade600,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('AGREE', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _decline() async {
    setState(() => _declined = true);
    await app_exit.closeApp();
    if (app_exit.isWebPlatform) {
      await Future<void>.delayed(const Duration(milliseconds: 400));
      if (mounted) setState(() {});
    }
  }
}

Future<void> showDisclaimerModal(BuildContext context) {
  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const DisclaimerModal(),
  );
}
