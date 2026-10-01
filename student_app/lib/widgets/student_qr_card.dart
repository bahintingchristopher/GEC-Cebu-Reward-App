import 'package:flutter/material.dart';
import 'package:barcode_widget/barcode_widget.dart';

class StudentQrCard extends StatelessWidget {
  final String studentName;
  final String? userId;
  final String qrToken;

  const StudentQrCard({
    super.key,
    required this.studentName,
    this.userId,
    required this.qrToken,
  });

  @override
  Widget build(BuildContext context) {
    // Code39 uses thicker bars with 2:1 wide/narrow ratio. The barcode is encoded
    // with just the bare token (no "RA:" prefix) because Code39 has no colon.
    // The backend already strips the "RA:" prefix before matching qr_token.
    return Container(
      // Full-width card: the barcode spans the whole width of the screen.
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  studentName,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF333333)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                userId ?? 'No user ID',
                style: const TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.w500),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.only(top: 16, bottom: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: Colors.black12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: BarcodeWidget(
              barcode: Barcode.code39(),
              data: qrToken,
              color: const Color(0xFF000000),
              width: double.infinity,
              height: 70,
              drawText: false,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            qrToken,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'monospace',
              fontWeight: FontWeight.bold,
              fontSize: 18,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Present barcode at check-in to add points automatically.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey, fontSize: 12, height: 1.4),
          ),
        ],
      ),
    );
  }
}