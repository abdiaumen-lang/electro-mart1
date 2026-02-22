import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export default function Login() {
  const { mutate: login, isPending } = useLogin();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [setupMode, setSetupMode] = useState(false);
  const [setupUsername, setSetupUsername] = useState("admin");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupPending, setSetupPending] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ username, password });
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    setSetupPending(true);
    try {
      const fixedUsername = "admin";
      const fixedPassword = "ElectroMart@2026!A9";
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: setupUsername, password: setupPassword }),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text) as { message?: string };
          if (parsed.message === "Admin already set up") {
            setUsername(fixedUsername);
            setPassword(fixedPassword);
            setSetupMode(false);
            login({ username: fixedUsername, password: fixedPassword });
            return;
          }
          throw new Error(parsed.message || "Setup failed");
        } catch {
          throw new Error(text || "Setup failed");
        }
      }
      setUsername(setupUsername);
      setPassword(setupPassword);
      setSetupMode(false);
      login({ username: setupUsername, password: setupPassword });
    } catch (err: any) {
      setSetupError(err?.message || "Setup failed");
    } finally {
      setSetupPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-secondary/30 border border-border/60 p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold font-display cursor-pointer hover:text-primary transition-colors">
              Electro<span className="text-primary">Mart</span>
            </h1>
          </Link>
          <p className="text-muted-foreground mt-2">{t("login.admin_login")}</p>
        </div>
        <div className="mb-6 rounded-lg border border-border/60 bg-background/60 p-3">
          <div className="text-xs text-muted-foreground">
            {t("login.first_run")}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-border/60"
              onClick={() => {
                setSetupError(null);
                setSetupMode((v) => !v);
              }}
            >
              {t("login.setup_admin")}
            </Button>
            <div className="text-xs text-muted-foreground">
              {t("login.then_login")}
            </div>
          </div>
        </div>

        {setupMode && (
          <form onSubmit={handleSetup} className="space-y-4 mb-6">
            {setupError && (
              <div className="text-sm text-destructive border border-destructive/40 bg-destructive/5 rounded-lg p-3">
                {t("login.setup_failed")}: {setupError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="setup-username">{t("login.username")}</Label>
              <Input
                id="setup-username"
                value={setupUsername}
                onChange={(e) => setSetupUsername(e.target.value)}
                className="bg-background/50 border-border/50 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-password">{t("login.password")}</Label>
              <Input
                id="setup-password"
                type="password"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                className="bg-background/50 border-border/50 h-12"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90"
              disabled={setupPending || !setupPassword || !setupUsername}
            >
              {setupPending ? <Loader2 className="animate-spin" /> : t("login.setup_admin")}
            </Button>
          </form>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">{t("login.username")}</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-background/50 border-border/50 h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("login.password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background/50 border-border/50 h-12"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-primary hover:bg-primary/90"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="animate-spin" /> : t("login.sign_in")}
          </Button>
        </form>
      </div>
    </div>
  );
}
