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
          Effective date: 18 January 2026
        </Text>
        <Text className="mt-1 text-sm text-[#6B7280]">
          Developer: Zehua Zhang
        </Text>
        <Text className="mt-1 text-sm text-[#6B7280]">
          Contact: edward.zehua.zhang@gmail.com
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          1) Acceptance of terms
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          By downloading or using NUS-Maps, you agree to these Terms.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          2) What the app provides
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          NUS-Maps provides campus map viewing and navigation features for NUS. Features may change over time.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          3) License
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          We grant you a personal, non-exclusive, non-transferable, revocable license to use NUS-Maps for your own, non-commercial use, subject to these Terms and applicable law.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          4) Acceptable use
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          You agree not to:
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          • Reverse engineer, modify, or attempt to extract the source code (except where allowed by law)
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          • Use the app for unlawful purposes
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          • Interfere with or disrupt the app or related services
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          5) Third-party services (Google Maps)
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          NUS-Maps includes Google Maps features/content. Your use of those features may be subject to Google's terms and policies. Google Maps Platform terms describe Google's data use to provide and improve services.
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          Google Maps Platform Terms: https://cloud.google.com/maps-platform/terms
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          6) Location and notifications permissions
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          Some features require your permission (e.g., location for live navigation, notifications for reminders). You can enable or disable these in iOS settings.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          7) No guarantees (important)
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          Maps and routes are provided "as is." While we try to provide useful navigation, we don't guarantee:
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          • The accuracy or completeness of map data, routing, or campus information
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          • That routes are always optimal, safe, or available (construction, closures, etc.)
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          8) Limitation of liability
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages, or any loss of data, arising from your use of the app.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          9) Changes, suspension, termination
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          We may update, suspend, or discontinue the app (or parts of it) at any time.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          10) Governing law
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          These Terms are governed by the laws of Singapore, without regard to conflict-of-law principles.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          11) Contact
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          Questions about these Terms: edward.zehua.zhang@gmail.com
        </Text>
      </View>
    </ScrollView>
  );
}

// Hide the header title and use a clear back label
export const options = {
  title: '',
  headerBackTitle: 'Back',
};
