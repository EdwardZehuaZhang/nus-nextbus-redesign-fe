import React from 'react';

import { ScrollView, Text, View } from '@/components/ui';

export default function TermsPage() {
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-10">
        <Text className="text-2xl font-bold text-[#111827]">
          Terms of Service
        </Text>
        <Text className="mt-2 text-sm text-[#6B7280]">
          Last updated: 2026-01-17
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          Acceptance of Terms
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          {
            'By using this app, you agree to these terms. If you do not agree, do not use '
          }
          {'the app.'}
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          Use of the App
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          The app provides transit information and navigation assistance. It is
          provided as-is without warranties of any kind.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          User Responsibility
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          {
            'You are responsible for your actions and for complying with local laws and '
          }
          {'safety guidance while using the app.'}
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          Changes to Terms
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          {
            'We may update these terms from time to time. Continued use of the app means '
          }
          {'you accept the updated terms.'}
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          Contact
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          For questions, contact: edward.zehua.zhang@gmail.com
        </Text>
      </View>
    </ScrollView>
  );
}
