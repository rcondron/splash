"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Voyage, VoyageStatus } from "@/types";
import { useVoyageStore } from "@/store/voyage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Ship, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface FormData {
  voyageName: string;
  internalReference: string;
  vesselName: string;
  imoNumber: string;
  cargoType: string;
  cargoQuantity: string;
  cargoUnit: string;
  loadPort: string;
  dischargePort: string;
  laycanStart: string;
  laycanEnd: string;
  freightRate: string;
  freightCurrency: string;
  rateBasis: string;
  ownerCompanyName: string;
  chartererCompanyName: string;
  brokerCompanyName: string;
  status: VoyageStatus;
  demurrageRate: string;
  notes: string;
}

interface FormErrors {
  [key: string]: string;
}

const INITIAL_FORM: FormData = {
  voyageName: "",
  internalReference: "",
  vesselName: "",
  imoNumber: "",
  cargoType: "",
  cargoQuantity: "",
  cargoUnit: "MT",
  loadPort: "",
  dischargePort: "",
  laycanStart: "",
  laycanEnd: "",
  freightRate: "",
  freightCurrency: "USD",
  rateBasis: "per MT",
  ownerCompanyName: "",
  chartererCompanyName: "",
  brokerCompanyName: "",
  status: VoyageStatus.DRAFT,
  demurrageRate: "",
  notes: "",
};

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function CreateVoyagePage() {
  const router = useRouter();
  const { addVoyage } = useVoyageStore();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post<Voyage>("/voyages", {
        reference: data.internalReference || undefined,
        vesselName: data.vesselName || undefined,
        vesselImo: data.imoNumber || undefined,
        cargoType: data.cargoType || undefined,
        cargoQuantity: data.cargoQuantity
          ? Number(data.cargoQuantity)
          : undefined,
        cargoUnit: data.cargoUnit || undefined,
        loadPort: data.loadPort || undefined,
        dischargePort: data.dischargePort || undefined,
        laycanFrom: data.laycanStart || undefined,
        laycanTo: data.laycanEnd || undefined,
        freightRate: data.freightRate ? Number(data.freightRate) : undefined,
        freightUnit: data.freightCurrency
          ? `${data.freightCurrency} ${data.rateBasis}`
          : undefined,
        demurrageRate: data.demurrageRate
          ? Number(data.demurrageRate)
          : undefined,
        status: data.status,
        notes: data.notes || undefined,
        ownerCompanyName: data.ownerCompanyName || undefined,
        chartererCompanyName: data.chartererCompanyName || undefined,
        brokerCompanyName: data.brokerCompanyName || undefined,
      }),
    onSuccess: (voyage) => {
      addVoyage(voyage);
      toast.success("Voyage created successfully");
      router.push(`/voyages/${voyage.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create voyage");
    },
  });

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.loadPort.trim()) newErrors.loadPort = "Load port is required";
    if (!form.dischargePort.trim())
      newErrors.dischargePort = "Discharge port is required";

    if (form.laycanStart && form.laycanEnd) {
      if (new Date(form.laycanEnd) < new Date(form.laycanStart)) {
        newErrors.laycanEnd = "Laycan end must be after start";
      }
    }

    if (form.cargoQuantity && isNaN(Number(form.cargoQuantity))) {
      newErrors.cargoQuantity = "Must be a number";
    }

    if (form.freightRate && isNaN(Number(form.freightRate))) {
      newErrors.freightRate = "Must be a number";
    }

    if (form.imoNumber && !/^\d{7}$/.test(form.imoNumber)) {
      newErrors.imoNumber = "IMO number must be 7 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    createMutation.mutate(form);
  };

  return (
    <div className="flex-1 p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/voyages")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Voyage</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set up a new chartering fixture
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ship className="h-5 w-5" />
              Voyage Details
            </CardTitle>
            <CardDescription>
              Core information about this voyage fixture
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Voyage Name">
              <Input
                placeholder="e.g. MV Pacific Star - Santos to Rotterdam"
                value={form.voyageName}
                onChange={(e) => update("voyageName", e.target.value)}
              />
            </FormField>
            <FormField label="Internal Reference">
              <Input
                placeholder="e.g. VOY-2026-001"
                value={form.internalReference}
                onChange={(e) => update("internalReference", e.target.value)}
              />
            </FormField>
            <FormField label="Status">
              <Select
                value={form.status}
                onValueChange={(val) =>
                  update("status", val as VoyageStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={VoyageStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={VoyageStatus.INQUIRY}>Inquiry</SelectItem>
                  <SelectItem value={VoyageStatus.NEGOTIATION}>
                    Negotiation
                  </SelectItem>
                  <SelectItem value={VoyageStatus.SUBJECTS}>
                    Subjects
                  </SelectItem>
                  <SelectItem value={VoyageStatus.FIXED}>Fixed</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </CardContent>
        </Card>

        {/* Vessel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vessel</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Vessel Name">
              <Input
                placeholder="e.g. MV Pacific Star"
                value={form.vesselName}
                onChange={(e) => update("vesselName", e.target.value)}
              />
            </FormField>
            <FormField label="IMO Number" error={errors.imoNumber}>
              <Input
                placeholder="e.g. 9876543"
                value={form.imoNumber}
                onChange={(e) => update("imoNumber", e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Cargo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cargo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField label="Cargo Type">
              <Input
                placeholder="e.g. Soybeans"
                value={form.cargoType}
                onChange={(e) => update("cargoType", e.target.value)}
              />
            </FormField>
            <FormField label="Quantity" error={errors.cargoQuantity}>
              <Input
                placeholder="e.g. 50000"
                value={form.cargoQuantity}
                onChange={(e) => update("cargoQuantity", e.target.value)}
              />
            </FormField>
            <FormField label="Unit">
              <Select
                value={form.cargoUnit}
                onValueChange={(val) => update("cargoUnit", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MT">MT</SelectItem>
                  <SelectItem value="CBM">CBM</SelectItem>
                  <SelectItem value="BBL">BBL</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </CardContent>
        </Card>

        {/* Route & Laycan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Route & Laycan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Load Port" required error={errors.loadPort}>
              <Input
                placeholder="e.g. Santos, Brazil"
                value={form.loadPort}
                onChange={(e) => update("loadPort", e.target.value)}
              />
            </FormField>
            <FormField
              label="Discharge Port"
              required
              error={errors.dischargePort}
            >
              <Input
                placeholder="e.g. Rotterdam, Netherlands"
                value={form.dischargePort}
                onChange={(e) => update("dischargePort", e.target.value)}
              />
            </FormField>
            <FormField label="Laycan Start">
              <Input
                type="date"
                value={form.laycanStart}
                onChange={(e) => update("laycanStart", e.target.value)}
              />
            </FormField>
            <FormField label="Laycan End" error={errors.laycanEnd}>
              <Input
                type="date"
                value={form.laycanEnd}
                onChange={(e) => update("laycanEnd", e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Freight & Commercial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Commercial Terms</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField label="Freight Rate" error={errors.freightRate}>
              <Input
                placeholder="e.g. 28.50"
                value={form.freightRate}
                onChange={(e) => update("freightRate", e.target.value)}
              />
            </FormField>
            <FormField label="Currency">
              <Select
                value={form.freightCurrency}
                onValueChange={(val) => update("freightCurrency", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Rate Basis">
              <Select
                value={form.rateBasis}
                onValueChange={(val) => update("rateBasis", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per MT">per MT</SelectItem>
                  <SelectItem value="lumpsum">Lumpsum</SelectItem>
                  <SelectItem value="per day">per Day</SelectItem>
                  <SelectItem value="per CBM">per CBM</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Demurrage Rate">
              <Input
                placeholder="e.g. 35000"
                value={form.demurrageRate}
                onChange={(e) => update("demurrageRate", e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parties</CardTitle>
            <CardDescription>
              Companies involved in this fixture
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField label="Owner Company">
              <Input
                placeholder="e.g. Pacific Shipping Ltd"
                value={form.ownerCompanyName}
                onChange={(e) => update("ownerCompanyName", e.target.value)}
              />
            </FormField>
            <FormField label="Charterer Company">
              <Input
                placeholder="e.g. Grain Trading Corp"
                value={form.chartererCompanyName}
                onChange={(e) =>
                  update("chartererCompanyName", e.target.value)
                }
              />
            </FormField>
            <FormField label="Broker Company">
              <Input
                placeholder="e.g. Maritime Brokers Inc"
                value={form.brokerCompanyName}
                onChange={(e) => update("brokerCompanyName", e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any additional notes about this voyage..."
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/voyages")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Voyage
          </Button>
        </div>
      </form>
    </div>
  );
}
