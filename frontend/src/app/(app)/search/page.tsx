"use client";

import { FeatureUnavailable } from "@/components/feature-unavailable";

export default function SearchPage() {
  return (
    <FeatureUnavailable
      title="Search Unavailable"
      description="Global search requires the local backend. This feature will be available once the Quint API supports search endpoints."
    />
  );
}
