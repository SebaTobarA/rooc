import { CoreGuildTabs } from "@/components/core-guild/core-guild-tabs";

export default function CoreGuildLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <CoreGuildTabs />
      <div className="mt-5">{children}</div>
    </div>
  );
}
