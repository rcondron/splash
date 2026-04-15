"use client";

import { FeatureUnavailable } from "@/components/feature-unavailable";

export default function NotificationsPage() {
  return (
    <FeatureUnavailable
      title="Notifications Unavailable"
      description="Notifications require the local backend. This feature will be available once the Quint API supports notification endpoints."
    />
  );
}
