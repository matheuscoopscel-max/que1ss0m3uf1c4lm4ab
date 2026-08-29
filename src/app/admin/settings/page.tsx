import { getAllSettings } from "@/lib/settings/settings";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const settings = await getAllSettings(["telegram_group_url", "instagram_url"]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Config</h1>
      <SettingsForm
        settingKey="telegram_group_url"
        label="Link de convite do grupo do Telegram (mostrado só pra quem já comprou)"
        initialValue={settings.telegram_group_url ?? process.env.TELEGRAM_GROUP_URL ?? ""}
      />
      <SettingsForm
        settingKey="instagram_url"
        label="Link do Instagram (mostrado na home)"
        initialValue={settings.instagram_url ?? process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? ""}
      />
    </div>
  );
}
