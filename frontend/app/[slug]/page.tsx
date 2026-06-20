"use client";

import { useParams, redirect } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SchoolRootPage() {
  const params = useParams();
  const slug = (params?.slug as string) ?? "";
  const router = useRouter();

  useEffect(() => {
    if (slug) {
      router.replace(`/${slug}/inicio`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return null;
}
