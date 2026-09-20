import { Suspense } from "react";
import { DrawingStudio } from "@/app/components/DrawingStudio";
import { WaitMongri } from "@/app/components/WaitMongri";
export default function DrawPage() { return <Suspense fallback={<WaitMongri line="도화지를 펴고 있어요" />}><DrawingStudio /></Suspense>; }
