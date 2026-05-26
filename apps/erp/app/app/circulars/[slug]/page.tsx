"use client";

import React, { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";

export default function CircularDetailPageRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  useEffect(() => {
    if (slug) {
      router.replace(`/app/circulars?select=${slug}`);
    }
  }, [slug, router]);

  return (
    <div className="flex h-[50vh] w-full items-center justify-center flex-col gap-3">
      <Spinner size="lg" color="accent" />
      <span className="text-sm font-semibold text-accent animate-pulse">Loading notice...</span>
    </div>
  );
}


