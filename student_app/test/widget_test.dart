import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/main.dart';

void main() {
  testWidgets('RewardApp builds', (WidgetTester tester) async {
    await tester.pumpWidget(const RewardApp());
    expect(find.byType(RewardApp), findsOneWidget);
  });
}
