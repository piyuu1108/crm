"use client";

import React, { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { 
  Spinner, 
  Card, 
  Button, 
  Chip,
  Alert
} from "@heroui/react";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { ArrowLeft, ArrowDownToLine, FileText, TrashBin, Calendar, Person } from "@gravity-ui/icons";

export default function CircularDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { activeRole } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["circular", slug],
    queryFn: async () => {
      const res = await fetch(`/api/circulars?limit=100`);
      if (!res.ok) throw new Error("Failed to fetch circular");
      const json = await res.json();
      const found = json.data.find((c: any) => c.slug === slug);
      if (!found) throw new Error("Circular not found");
      return found;
    },
  });

  const isHod = activeRole === "hod";
  const canDelete = isHod || (activeRole === "faculty" && data?.facultyId === useAuthStore.getState().user?.id);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this circular?")) return;
    
    try {
      const res = await fetch(`/api/faculty/circulars/${slug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/app/circulars");
    } catch (err) {
      alert("Error deleting circular.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" color="accent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error</Alert.Title>
            <Alert.Description>Circular not found or access denied.</Alert.Description>
          </Alert.Content>
        </Alert>
        <Button variant="tertiary" className="mt-4" onPress={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          isIconOnly
          variant="tertiary"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {canDelete && (
          <Button variant="danger" onPress={handleDelete}>
            <TrashBin className="w-4 h-4" />
            Delete
          </Button>
        )}
      </div>

      <Card className="p-6 lg:p-8">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-4">{data.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b border-divider pb-6">
              <div className="flex items-center gap-1">
                <Person className="w-4 h-4" />
                <span>{data.facultyName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{new Intl.DateTimeFormat('en-US', { month: 'long', day: '2-digit', year: 'numeric' }).format(new Date(data.createdAt))}</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Chip variant="secondary" size="sm">
                  {data.targetType === "ALL" ? "All Students" : data.targetType === "YEAR" ? `Year ${data.targetYear}` : `Division Specific`}
                </Chip>
              </div>
            </div>
          </div>

          {data.description && (
            <div 
              className="prose prose-sm sm:prose lg:prose-lg max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: data.description }}
            />
          )}

          {data.attachmentUrl && (
            <div className="mt-8 pt-6 border-t border-divider">
              <h3 className="text-lg font-semibold mb-4">Attachment</h3>
              <Card className="bg-default-50 border border-divider shadow-none">
                <Card.Content className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 text-primary rounded-lg">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Document</p>
                      <p className="text-xs text-muted-foreground">
                        {data.attachmentType} • {Math.round(data.attachmentSize / 1024)} KB
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="primary"
                    onPress={() => window.open(data.attachmentUrl.startsWith('http') ? data.attachmentUrl : `https://${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.amazonaws.com/${data.attachmentUrl}`, "_blank")}
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    Download
                  </Button>
                </Card.Content>
              </Card>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
