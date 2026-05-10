"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Input, 
  Button, 
  Select,
  ListBox,
  Label,
  Card,
  Alert,
  Form
} from "@heroui/react";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { RichTextEditor } from "../components/rich-text-editor";
import { ArrowLeft, ArrowUpToLine, File } from "@gravity-ui/icons";
import { useQuery } from "@tanstack/react-query";

export default function CreateCircularPage() {
  const router = useRouter();
  const { activeRole } = useAuthStore();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetType, setTargetType] = useState("ALL");
  const [targetYear, setTargetYear] = useState<string>("");
  const [targetDivisionId, setTargetDivisionId] = useState<string>("");
  
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: divisionsData } = useQuery({
    queryKey: ["divisions-all"],
    queryFn: async () => {
      const res = await fetch("/api/admin/divisions?limit=1000"); // Just to fetch all
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: targetType === "DIVISION"
  });

  const isFacultyOrHod = activeRole === "faculty" || activeRole === "hod";

  if (!isFacultyOrHod) {
    return (
      <div className="p-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unauthorized</Alert.Title>
            <Alert.Description>You do not have permission to view this page.</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 2 * 1024 * 1024) {
        setError("File size exceeds 2MB limit.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (targetType === "YEAR" && !targetYear) {
      setError("Target Year is required when targeting by Year.");
      return;
    }

    if (targetType === "DIVISION" && !targetDivisionId) {
      setError("Target Division is required when targeting by Division.");
      return;
    }

    setIsSubmitting(true);

    try {
      let attachmentUrl = null;
      let attachmentType = null;
      let attachmentSize = null;

      // Upload file if exists
      if (file) {
        const urlRes = await fetch("/api/faculty/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docType: "circular_attachment",
            contentType: file.type,
            fileSize: file.size,
          }),
        });

        if (!urlRes.ok) {
          const errData = await urlRes.json();
          throw new Error(errData.error || "Failed to get upload URL");
        }

        const { data: { uploadUrl, fileKey } } = await urlRes.json();

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file to S3");
        }

        // Just store the relative path or public URL (in real app, you would configure Cloudfront)
        // Here we store fileKey to construct URL later, or full URL depending on S3 config.
        attachmentUrl = fileKey;
        attachmentType = file.type;
        attachmentSize = file.size;
      }

      // Create Circular
      const res = await fetch("/api/faculty/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          targetType,
          targetYear: targetYear ? parseInt(targetYear, 10) : null,
          targetDivisionId: targetDivisionId ? parseInt(targetDivisionId, 10) : null,
          attachmentUrl,
          attachmentType,
          attachmentSize,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create circular");
      }

      router.push("/app/circulars");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          isIconOnly
          variant="tertiary"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Circular</h1>
          <p className="text-sm text-muted-foreground">Publish a new notice or circular</p>
        </div>
      </div>

      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <Card className="p-6">
        <Form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-1">
            <Label>Title</Label>
            <Input
              required
              placeholder="Enter circular title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Write the details of the circular here..."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Select
              isRequired
              className="flex-1"
              placeholder="Select audience type"
              selectedKey={targetType}
              onSelectionChange={(value) => setTargetType(value as string)}
            >
              <Label>Target Audience</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="ALL" textValue="All Students">
                    All Students
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="YEAR" textValue="Specific Year">
                    Specific Year
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="DIVISION" textValue="Specific Division">
                    Specific Division
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            {targetType === "YEAR" && (
              <Select
                isRequired
                className="flex-1"
                placeholder="Choose year"
                selectedKey={targetYear}
                onSelectionChange={(value) => setTargetYear(value as string)}
              >
                <Label>Select Year</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="1" textValue="1st Year">
                      1st Year
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="2" textValue="2nd Year">
                      2nd Year
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="3" textValue="3rd Year">
                      3rd Year
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="4" textValue="4th Year">
                      4th Year
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            )}

            {targetType === "DIVISION" && (
              <Select
                isRequired
                className="flex-1"
                placeholder="Choose division"
                selectedKey={targetDivisionId}
                onSelectionChange={(value) => setTargetDivisionId(value as string)}
                isDisabled={!divisionsData}
              >
                <Label>Select Division</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {(divisionsData?.data?.divisions || []).map((div: any) => (
                      <ListBox.Item key={div.id.toString()} id={div.id.toString()} textValue={div.displayName}>
                        {div.displayName}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-divider pt-6">
            <label className="text-sm font-medium text-foreground">Attachment (Optional, Max 2MB, PDF/Image)</label>
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                onPress={() => document.getElementById('circular-file-upload')?.click()}
              >
                <ArrowUpToLine className="w-4 h-4" />
                Choose File
              </Button>
              <input
                id="circular-file-upload"
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <File className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span>({Math.round(file.size / 1024)} KB)</span>
                  <Button size="sm" isIconOnly variant="tertiary" className="text-danger" onPress={() => setFile(null)}>×</Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-divider w-full">
            <Button variant="tertiary" onPress={() => router.back()}>Cancel</Button>
            <Button variant="primary" type="submit" isPending={isSubmitting}>Publish Circular</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
