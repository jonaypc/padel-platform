export type MatchRow = {
  id: string;
  played_at: string | null;
  match_type: "pachanga" | "entrenamiento" | "liga" | "torneo" | null;
  partner_name: string | null;
  location: string | null;
  opponent1_name: string | null;
  opponent2_name: string | null;

  set1_us: number | null;
  set1_them: number | null;
  set2_us: number | null;
  set2_them: number | null;
  set3_us: number | null;
  set3_them: number | null;
  notes: string | null;
};
