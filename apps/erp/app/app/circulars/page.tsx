"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner, Button, Card, Chip, Pagination } from "@heroui/react";
import { Plus } from "@gravity-ui/icons";

export default function CircularsPage() {
  const { activeRole } = useAuthStore();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ["circulars", page],
    queryFn: async () => {
      const res = await fetch(`/api/circulars?limit=${limit}&offset=${(page - 1) * limit}`);
      if (!res.ok) throw new Error("Failed to fetch circulars");
      return res.json();
    },
  });

  const isFacultyOrHod = activeRole === "faculty" || activeRole === "hod";

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" color="accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-danger">
        Failed to load circulars. Please try again.
      </div>
    );
  }

  const circulars = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Circulars & Notices</h1>
          <p className="text-sm text-muted-foreground">Stay updated with the latest announcements</p>
        </div>
        {isFacultyOrHod && (
          <Button
            onPress={() => router.push("/app/circulars/create")}
          >
            <Plus className="h-4 w-4" />
            Create Circular
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {circulars.length === 0 ? (
          <Card className="p-8 text-center bg-default-50">
            <Card.Content>
              <p className="text-muted-foreground">No circulars found.</p>
            </Card.Content>
          </Card>
        ) : (
          circulars.map((circular: any) => (
            <Link key={circular.id} href={`/app/circulars/${circular.slug}`} className="block w-full">
              <Card className="w-full border border-divider hover:border-accent/40 transition-colors">
                <Card.Content className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold">{circular.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>By {circular.facultyName}</span>
                      <span>•</span>
                      <span>{new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(circular.createdAt))}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {circular.attachmentUrl && (
                      <Chip variant="soft" size="sm">Attachment</Chip>
                    )}
                    <Chip variant="soft" size="sm">
                      {circular.targetType === "ALL" ? "All Students" : circular.targetType === "YEAR" ? `Year ${circular.targetYear}` : `Division Specific`}
                    </Chip>
                  </div>
                </Card.Content>
              </Card>
            </Link>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination className="justify-center">
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous isDisabled={page === 1} onPress={() => setPage(page - 1)}>
                  <Pagination.PreviousIcon />
                </Pagination.Previous>
              </Pagination.Item>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item key={p}>
                  <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
                    {p}
                  </Pagination.Link>
                </Pagination.Item>
              ))}
              <Pagination.Item>
                <Pagination.Next isDisabled={page === totalPages} onPress={() => setPage(page + 1)}>
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </div>
      )}
    </div>
  );
}
