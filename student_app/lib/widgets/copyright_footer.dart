import 'package:flutter/material.dart';

class CopyrightFooter extends StatelessWidget {
  const CopyrightFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: const [
            Text(
              'DISCLAIMER',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFFD32F2F),
                fontSize: 17,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
            SizedBox(height: 6),
            Text(
              'For attendance tracking only; data remains exclusively within the GEC-CEBU Center.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFFD32F2F),
                fontSize: 15,
                fontWeight: FontWeight.normal,
              ),
            ),
            SizedBox(height: 8),
            Text(
              '\u00A9 2026 GEC Cebu Rewards Plus. Made for BYU-GEC. Powered by ALMA LLC.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
