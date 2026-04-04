import { create } from "zustand";
import { Voyage } from "@/types";

interface VoyageState {
  activeVoyage: Voyage | null;
  voyages: Voyage[];
  setActiveVoyage: (voyage: Voyage | null) => void;
  setVoyages: (voyages: Voyage[]) => void;
  updateVoyage: (id: string, updates: Partial<Voyage>) => void;
  addVoyage: (voyage: Voyage) => void;
  removeVoyage: (id: string) => void;
}

export const useVoyageStore = create<VoyageState>()((set) => ({
  activeVoyage: null,
  voyages: [],

  setActiveVoyage: (voyage) => {
    set({ activeVoyage: voyage });
  },

  setVoyages: (voyages) => {
    set({ voyages });
  },

  updateVoyage: (id, updates) => {
    set((state) => ({
      voyages: state.voyages.map((v) =>
        v.id === id ? { ...v, ...updates } : v,
      ),
      activeVoyage:
        state.activeVoyage?.id === id
          ? { ...state.activeVoyage, ...updates }
          : state.activeVoyage,
    }));
  },

  addVoyage: (voyage) => {
    set((state) => ({
      voyages: [voyage, ...state.voyages],
    }));
  },

  removeVoyage: (id) => {
    set((state) => ({
      voyages: state.voyages.filter((v) => v.id !== id),
      activeVoyage: state.activeVoyage?.id === id ? null : state.activeVoyage,
    }));
  },
}));
