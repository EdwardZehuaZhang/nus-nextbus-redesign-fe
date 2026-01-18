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
          Effective date: 18 January 2026
        </Text>
        <Text className="mt-1 text-sm text-[#6B7280]">
          Developer: Zehua Zhang ("we", "us")
        </Text>
        <Text className="mt-1 text-sm text-[#6B7280]">
          Contact: edward.zehua.zhang@gmail.com
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          1) Overview
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          NUS-Maps is a campus navigation app for the National University of Singapore. This Privacy Policy explains what information we collect, how we use it, and your choices. Apple requires a privacy policy URL for all apps in App Store Connect.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          2) Information we collect
        </Text>
        <Text className="mt-4 text-base font-semibold text-[#111827]">
          A. Location (Precise Location — optional)
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          If you allow Location Services, we access precise location to show your position on the map and provide navigation/routing. Precise location generally means latitude/longitude-level accuracy.
        </Text>

        <Text className="mt-4 text-base font-semibold text-[#111827]">
          B. Diagnostics and device information
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          We may collect (or receive) limited technical data to keep the app reliable, such as:
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          • Crash data and performance/diagnostic information
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          • Basic device and app information (e.g., device model, iOS version)
        </Text>

        <Text className="mt-4 text-base font-semibold text-[#111827]">
          C. Notifications (optional)
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          If you enable reminders, NUS-Maps can schedule notifications (for example, a "time to leave" reminder). iOS requires you to grant permission for notifications.
        </Text>

        <Text className="mt-4 text-base font-semibold text-[#111827]">
          What we do not collect:
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          • No account creation, no names, no phone numbers, no emails inside the app
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          • No payments
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          • No user-generated content
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          3) How we use information
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          We use the information above to:
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          • Provide navigation features (maps, routing, live position on campus)
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          • Improve stability and performance (debug crashes, fix bugs)
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          • Deliver notifications only when you enable them in-app
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          4) Third-party services (Google Maps SDK)
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          NUS-Maps uses Google Maps SDK / Google Maps Platform to display maps and provide map functionality. The Google Maps Platform Terms note that Google may collect and receive data such as search terms, IP addresses, and latitude/longitude coordinates to provide and improve services, subject to Google's Privacy Policy.
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          Google Privacy Policy: https://policies.google.com/privacy
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          Google Maps Platform Terms: https://cloud.google.com/maps-platform/terms
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          5) Data sharing
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          • We do not sell your personal data.
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          • We share information only as needed to operate the app:
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
            - With Google Maps Platform as part of providing map features (see section 4).
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
            - With service providers involved in crash reporting/diagnostics if you add them in the future (if you do, this policy should be updated).
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          6) Data retention
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          • We do not maintain user accounts or a user database.
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          • Any on-device cache (e.g., map tiles or recent routes) is generally stored locally and can be removed by deleting the app.
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          • Third-party services (e.g., Google) may retain data according to their policies and terms.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          7) Your choices
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          You can control your data through iOS settings:
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          • Location: allow/deny precise location (or use approximate location where available)
        </Text>
        <Text className="mt-1 text-base text-[#374151]">
          • Notifications: allow/deny notifications at any time
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          If you deny permissions, the app should still work with reduced functionality (e.g., manual browsing without "blue dot" live location).
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          8) Security
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          We take reasonable steps to protect information in our control. However, no method of transmission or storage is 100% secure.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          9) Children's privacy
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          NUS-Maps is not specifically directed to children under 13, and we do not knowingly collect personal data from children.
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          10) Singapore PDPA
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          If you are in Singapore, the Personal Data Protection Act (PDPA) generally governs how organizations collect, use, and disclose personal data.
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          If you have questions or requests about personal data relating to NUS-Maps, contact us at the email above.
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          More info: https://www.pdpc.gov.sg
        </Text>

        <Text className="mt-6 text-base font-semibold text-[#111827]">
          11) Changes to this policy
        </Text>
        <Text className="mt-2 text-base text-[#374151]">
          We may update this Privacy Policy from time to time. The "Effective date" will reflect the latest version.
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
