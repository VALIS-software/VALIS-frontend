import { Strand } from "./Strand";

export type Feature = {
    id: string | undefined;
    name: string | undefined;
    type: string;
    children: Array<Feature>;
    start: number;
    end: number;
    strand: Strand;
    phase: number | null;
};