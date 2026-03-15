import { Paperclip } from "lucide-react";
import CollapsibleSection from "./CollapsibleSection";

interface Props {
  notes: string;
  terms: string;
  onNotesChange: (v: string) => void;
  onTermsChange: (v: string) => void;
}

const AdditionalSection = ({ notes, terms, onNotesChange, onTermsChange }: Props) => (
  <CollapsibleSection title="Additional" defaultOpen={false}>
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
        <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={2}
          placeholder="Thank you for your business!"
          className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Terms & Conditions</label>
        <textarea value={terms} onChange={(e) => onTermsChange(e.target.value)} rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
      </div>
      <button className="flex items-center gap-1.5 text-sm text-accent hover:underline font-medium">
        <Paperclip size={14} /> Attach file
      </button>
    </div>
  </CollapsibleSection>
);

export default AdditionalSection;
