import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'

interface SemesterState {
  selectedSemesterId: string | null;
  setSelectedSemesterId: (id: string | null) => void;
}

// Create a store with persistence (optional, using localStorage)
export const useSemesterStore = create<SemesterState>()(
  persist(
    (set) => ({
      selectedSemesterId: null, // Start with no semester selected
      setSelectedSemesterId: (id) => set({ selectedSemesterId: id }),
    }),
    {
      name: 'semester-storage', // Name for the localStorage item
      storage: createJSONStorage(() => localStorage), // Use localStorage
    }
  )
); 