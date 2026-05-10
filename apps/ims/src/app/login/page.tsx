"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, TextField, Label, Input, Form } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ErrorAlert } from "@/components/ui/Alerts";
import ChangePasswordModal from "@/components/ChangePasswordModal";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      if (data.mustChangePassword) {
        setShowChangePassword(true);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        

        {/* Login Card */}
        <Card className="w-full">
          <Card.Header className="px-6 pt-6 pb-0">
            <Card.Title className="text-base font-semibold">Sign in to your account</Card.Title>
            <Card.Description className="text-sm mt-0.5">
              Enter your credentials to access the dashboard
            </Card.Description>
          </Card.Header>

          <Form onSubmit={handleSubmit}>
            <Card.Content className="px-6 py-5">
              {error && <ErrorAlert message={error} className="mb-4" />}
              <div className="flex flex-col gap-4">
                <TextField
                  name="email"
                  type="email"
                  isRequired
                  value={email}
                  onChange={setEmail}
                >
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <Input
                    placeholder="admin@manage.edu"
                    autoFocus
                    className="mt-1"
                  />
                </TextField>

                <TextField
                  name="password"
                  type={isPasswordVisible ? "text" : "password"}
                  isRequired
                  value={password}
                  onChange={setPassword}
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">Password</Label>
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible((v) => !v)}
                      className="text-xs text-muted hover:text-gray-700 transition-colors"
                    >
                      {isPasswordVisible ? "Hide" : "Show"}
                    </button>
                  </div>
                  <Input
                    placeholder="Enter your password"
                    className="mt-1"
                  />
                </TextField>
              </div>
            </Card.Content>

            <Card.Footer className="px-6 pb-6 pt-0 flex-col gap-3">
              <Button type="submit" fullWidth isDisabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <p className="text-center text-xs text-muted">
                Authorized personnel only
              </p>
            </Card.Footer>
          </Form>
        </Card>

      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onSuccess={() => {
          setShowChangePassword(false);
          router.push("/dashboard");
        }}
      />
    </div>
  );
}