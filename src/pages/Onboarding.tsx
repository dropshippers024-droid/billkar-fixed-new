import { useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Check, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";
import { saveBusinessProfile } from "@/lib/businessStore";
import { toast } from "sonner";

const businessTypes = ["Retailer", "Wholesaler", "Freelancer", "Service Provider", "Manufacturer"];

const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman & Nicobar Islands","Chandigarh","Dadra & Nagar Haveli and Daman & Diu",
  "Delhi","Jammu & Kashmir","Ladakh","Lakshadweep","Puducherry",
];

const templates = [
  { id: 1, name: "Classic", color: "from-primary/30 to-primary/10" },
  { id: 2, name: "Modern", color: "from-accent/30 to-accent/10" },
  { id: 3, name: "Minimal", color: "from-muted to-card" },
];

const templateIdMap: Record<number, string> = {
  1: "classic",
  2: "modern",
  3: "minimal",
};

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [bizName, setBizName] = useState("");
  const [bizType, setBizType] = useState("");
  const [gstin, setGstin] = useState("");
  const [state, setState] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const [logoUrl, setLogoUrl] = useState("");
  const [finishing, setFinishing] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#6366F1", "#10B981", "#F59E0B"],
    });
  }, []);

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await saveBusinessProfile({
        name: bizName,
        gstin,
        state,
        logoUrl,
        businessType: bizType,
        defaultTemplate: templateIdMap[selectedTemplate] || "modern",
      });
      fireConfetti();
      toast.success("Setup complete");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch {
      toast.error("Failed to save profile. You can update it in Settings.");
      navigate("/dashboard");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be 2MB or smaller");
      return;
    }

    const nextLogoUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Failed to read logo file"));
      reader.readAsDataURL(file);
    });
    setLogoUrl(nextLogoUrl);
  };

  const canNext = step === 1 ? bizName && bizType : true;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-extrabold tracking-tight">
            Bill<span className="text-gradient-primary">Kar</span>
          </Link>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground font-medium">Step {step} of 3</p>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? "bg-primary w-6" : "bg-border w-3"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step check dots row */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  s < step
                    ? "bg-primary text-primary-foreground"
                    : s === step
                    ? "bg-primary/10 text-primary border-2 border-primary"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                {s < step ? <Check size={16} /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-0.5 rounded-full transition-colors ${s < step ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-extrabold mb-1">Tell us about your business</h2>
              <p className="text-muted-foreground mb-6 text-sm">This helps us customize your experience.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Business Name</label>
                  <input
                    type="text"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                    placeholder="e.g., Sharma Electronics"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Business Type</label>
                  <select
                    value={bizType}
                    onChange={(e) => setBizType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none transition-all duration-200"
                  >
                    <option value="">Select type</option>
                    {businessTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-extrabold mb-1">GST Details</h2>
              <p className="text-muted-foreground mb-6 text-sm">Optional — you can add this later in Settings.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className={`w-full px-4 py-3 rounded-xl bg-card border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono transition-all duration-200 ${
                      gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)
                        ? "border-destructive"
                        : "border-border"
                    }`}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Format: 2-digit state code + PAN + entity number. Example: 22AAAAA0000A1Z5
                  </p>
                  {gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin) && (
                    <p className="text-xs text-destructive mt-1">Invalid GSTIN format</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none transition-all duration-200"
                  >
                    <option value="">Select state</option>
                    {indianStates.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-extrabold mb-1">Personalize</h2>
              <p className="text-muted-foreground mb-6 text-sm">Upload your logo and pick a template.</p>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-3 block">Business Logo</label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="glass-card p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 transition-colors"
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="Business logo" className="max-h-20 max-w-full object-contain rounded" />
                    ) : (
                      <>
                        <Upload size={32} className="text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload logo</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-3 block">Choose Template</label>
                  <div className="grid grid-cols-3 gap-3">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t.id)}
                        className={`rounded-xl p-4 h-28 bg-gradient-to-br ${t.color} border-2 transition-all duration-200 flex flex-col items-center justify-end hover:scale-[1.03] ${
                          selectedTemplate === t.id ? "border-primary glow-primary" : "border-transparent"
                        }`}
                      >
                        <span className="text-xs font-medium">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-ghost-outline px-6 py-3 text-sm font-semibold flex-1"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <div className="flex-1 flex flex-col gap-2">
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canNext}
                className="btn-accent px-6 py-3 text-sm font-semibold w-full hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                Continue
              </button>
              <button
                onClick={() => setStep(step + 1)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                Skip this step
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2">
              <button
                onClick={handleFinish}
                disabled={finishing}
                className="btn-accent px-6 py-3 text-sm font-semibold w-full hover:scale-[1.02] transition-transform disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {finishing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Finish Setup"
                )}
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                Skip this step
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
