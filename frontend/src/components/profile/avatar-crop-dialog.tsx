"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCroppedSquareJpegDataUrl } from "@/lib/avatar-url";
import { Loader2 } from "lucide-react";

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onComplete: (jpegDataUrl: string) => void;
  onError?: (message: string) => void;
}

export function AvatarCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onComplete,
  onError,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
    null,
  );
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (open && imageSrc) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback(
    (_area: Area, areaPixels: Area) => {
      setCroppedAreaPixels(areaPixels);
    },
    [],
  );

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      onError?.("Adjust the crop, then try again.");
      return;
    }
    setApplying(true);
    try {
      const dataUrl = await getCroppedSquareJpegDataUrl(
        imageSrc,
        croppedAreaPixels,
      );
      onComplete(dataUrl);
      onOpenChange(false);
    } catch {
      onError?.("Could not crop that image. Try another file.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <DialogTitle className="text-left text-base font-semibold text-slate-900">
            Crop your photo
          </DialogTitle>
          <p className="text-left text-sm text-slate-500">
            Drag to reposition. Use zoom to frame your face. The result is a
            square — no stretching.
          </p>
        </DialogHeader>

        {imageSrc ? (
          <div className="relative h-[min(55vh,320px)] w-full bg-slate-950">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
        ) : null}

        <div className="border-t border-slate-200 px-6 py-3">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Zoom
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
          />
        </div>

        <DialogFooter className="gap-2 border-t border-slate-200 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={applying}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleApply}
            disabled={applying || !imageSrc}
          >
            {applying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying…
              </>
            ) : (
              "Apply"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
