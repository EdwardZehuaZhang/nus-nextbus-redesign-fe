import React from 'react';

import { ScrollView, Text, View } from '@/components/ui';

export default function PrivacyPage() {
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-10">
        <Text className="text-2xl font-bold text-[#111827]">
          Privacy Policy
        </Text>
        <Text className="mt-2 text-sm text-[#6B7280]">
          Last updated: 2026-01-17
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          Information We Collect
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          • Location (foreground only) to show nearby bus stops and help with
          navigation.
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          • Diagnostic and performance data (e.g., crash reports) to improve
          stability.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          How We Use Information
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          We use location to power proximity-based features and navigation.
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          Diagnostic data is used to monitor app performance and fix crashes.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          Third-Party Services
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          We use service providers (e.g., crash reporting and map services) to
          operate the app. These providers process data only on our behalf and
          only for app functionality and stability.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          Data Sharing
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          We do not sell personal data. Diagnostic data may be processed by
          service providers (e.g., crash reporting) solely to operate and
          improve the app.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          Your Choices
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          You can disable location access in device settings, which may limit
          some features.
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          The app does not require an account. If you contact support, we use
          your email only to respond to your request.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          Data Retention
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          Diagnostic data is retained only as long as needed to troubleshoot and
          improve reliability. Location data is used in real time and is not
          stored as part of your profile.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          Tracking and Advertising
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          We do not use data for advertising and do not track you across apps
          or websites owned by other companies.
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

// Hide the header title and use a clear back label
export const options = {
  title: '',
  headerBackTitle: 'Back',
};
