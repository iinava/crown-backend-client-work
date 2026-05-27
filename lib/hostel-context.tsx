"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

interface Hostel {
  id: number;
  name: string;
  slug: string;
}

interface HostelContextValue {
  hostels: Hostel[];
  /** null = "All hostels" (default) */
  current: Hostel | null;
  setHostel: (slug: string) => void;
  isLoading: boolean;
  /** Empty string = no filter (all hostels). Otherwise "crown-3" or "crown-4" */
  hostelParam: string;
  /** Display label: "All Hostels" or "Crown 3" etc */
  label: string;
}

const HostelContext = createContext<HostelContextValue>({
  hostels: [],
  current: null,
  setHostel: () => {},
  isLoading: true,
  hostelParam: "",
  label: "All Hostels",
});

export function HostelProvider({ children }: { children: ReactNode }) {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [current, setCurrent] = useState<Hostel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hostels")
      .then((r) => r.json())
      .then((data: Hostel[]) => {
        setHostels(data);
        // Restore from localStorage — default is "all" (null)
        const saved = localStorage.getItem("selectedHostel");
        if (saved && saved !== "all") {
          const match = data.find((h) => h.slug === saved);
          setCurrent(match ?? null);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const setHostel = useCallback(
    (slug: string) => {
      if (slug === "all") {
        setCurrent(null);
        localStorage.setItem("selectedHostel", "all");
      } else {
        const match = hostels.find((h) => h.slug === slug);
        if (match) {
          setCurrent(match);
          localStorage.setItem("selectedHostel", slug);
        }
      }
    },
    [hostels]
  );

  return (
    <HostelContext.Provider
      value={{
        hostels,
        current,
        setHostel,
        isLoading,
        hostelParam: current?.slug ?? "",
        label: current?.name ?? "All Hostels",
      }}
    >
      {children}
    </HostelContext.Provider>
  );
}

export function useHostel() {
  return useContext(HostelContext);
}
