import type { GuideMark } from "@/lib/lesson-content";

const curve = (
  step: number,
  ...points: [[number, number], [number, number], [number, number], [number, number]]
): GuideMark => ({ step, kind: "curve", points });
const line = (step: number, ...points: Array<[number, number]>): GuideMark => ({ step, kind: "line", points });
const ellipse = (step: number, x: number, y: number, rx: number, ry = rx): GuideMark => ({ step, kind: "ellipse", x, y, rx, ry });

type DogPose = {
  headShift: number;
  headTilt: number;
  mirror: boolean;
  raisedEar: "none" | "left" | "right";
  tailSide: "left" | "right";
  spotSide: "left" | "right";
};

function clamp(value: number) {
  return Math.max(0.025, Math.min(0.975, Number(value.toFixed(4))));
}

function posePoint(point: [number, number], pose: DogPose, part: "head" | "body" = "head"): [number, number] {
  let [x, y] = point;
  if (pose.mirror) x = 1 - x;

  if (part === "head") {
    const pivot: [number, number] = [0.5, 0.34];
    const radians = pose.headTilt * Math.PI / 180;
    const offsetX = x - pivot[0];
    const offsetY = y - pivot[1];
    x = pivot[0] + offsetX * Math.cos(radians) - offsetY * Math.sin(radians) + pose.headShift;
    y = pivot[1] + offsetX * Math.sin(radians) + offsetY * Math.cos(radians);
  } else {
    x += pose.headShift * 0.35;
  }

  return [clamp(x), clamp(y)];
}

function poseMark(mark: GuideMark, pose: DogPose, part: "head" | "body" = "head"): GuideMark {
  if (mark.kind === "line" || mark.kind === "curve") {
    return { ...mark, points: mark.points.map((point) => posePoint(point, pose, part)) } as GuideMark;
  }
  if (mark.kind === "ellipse") {
    const center = posePoint([mark.x, mark.y], pose, part);
    return { ...mark, x: center[0], y: center[1] };
  }
  return mark;
}

function floppyEar(side: "left" | "right"): GuideMark[] {
  const marks: GuideMark[] = [
    curve(2, [0.35, 0.22], [0.29, 0.15], [0.18, 0.18], [0.18, 0.31]),
    curve(2, [0.18, 0.31], [0.18, 0.41], [0.25, 0.46], [0.32, 0.39]),
    curve(2, [0.32, 0.39], [0.31, 0.33], [0.33, 0.26], [0.35, 0.22]),
  ];
  if (side === "left") return marks;
  return marks.map((mark) => {
    if (mark.kind !== "curve") return mark;
    return { ...mark, points: mark.points.map(([x, y]) => [1 - x, y]) } as GuideMark;
  });
}

function raisedEar(side: "left" | "right"): GuideMark[] {
  const marks: GuideMark[] = [
    curve(2, [0.35, 0.22], [0.31, 0.14], [0.29, 0.08], [0.33, 0.07]),
    curve(2, [0.33, 0.07], [0.39, 0.07], [0.42, 0.16], [0.40, 0.23]),
    curve(2, [0.40, 0.23], [0.38, 0.27], [0.36, 0.26], [0.35, 0.22]),
  ];
  if (side === "left") return marks;
  return marks.map((mark) => {
    if (mark.kind !== "curve") return mark;
    return { ...mark, points: mark.points.map(([x, y]) => [1 - x, y]) } as GuideMark;
  });
}

function buildDogGuide(pose: DogPose): GuideMark[] {
  const head: GuideMark[] = [
    curve(1, [0.35, 0.22], [0.39, 0.13], [0.61, 0.13], [0.65, 0.22]),
    curve(1, [0.65, 0.22], [0.71, 0.29], [0.69, 0.42], [0.60, 0.49]),
    curve(1, [0.60, 0.49], [0.55, 0.54], [0.45, 0.54], [0.40, 0.49]),
    curve(1, [0.40, 0.49], [0.31, 0.42], [0.29, 0.29], [0.35, 0.22]),
    ...(pose.raisedEar === "left" ? raisedEar("left") : floppyEar("left")),
    ...(pose.raisedEar === "right" ? raisedEar("right") : floppyEar("right")),
    ellipse(3, 0.42, 0.31, 0.018, 0.026),
    ellipse(3, 0.58, 0.31, 0.018, 0.026),
    ellipse(3, 0.50, 0.385, 0.024, 0.018),
    curve(3, [0.50, 0.402], [0.49, 0.432], [0.46, 0.438], [0.445, 0.416]),
    curve(3, [0.50, 0.402], [0.51, 0.432], [0.54, 0.438], [0.555, 0.416]),
    curve(3, [0.37, 0.375], [0.385, 0.384], [0.395, 0.384], [0.405, 0.375]),
    curve(3, [0.595, 0.375], [0.605, 0.384], [0.615, 0.384], [0.63, 0.375]),
  ].map((mark) => poseMark(mark, pose, "head"));

  const body: GuideMark[] = [
    curve(4, [0.405, 0.49], [0.34, 0.58], [0.35, 0.79], [0.43, 0.86]),
    curve(4, [0.43, 0.86], [0.47, 0.90], [0.53, 0.90], [0.57, 0.86]),
    curve(4, [0.57, 0.86], [0.65, 0.79], [0.66, 0.58], [0.595, 0.49]),
    line(4, [0.445, 0.61], [0.44, 0.82], [0.47, 0.84]),
    line(4, [0.555, 0.61], [0.56, 0.82], [0.53, 0.84]),
    curve(5, [0.405, 0.535], [0.46, 0.565], [0.54, 0.565], [0.595, 0.535]),
    ellipse(5, 0.42, 0.855, 0.065, 0.035),
    ellipse(5, 0.58, 0.855, 0.065, 0.035),
    ellipse(5, pose.spotSide === "left" ? 0.41 : 0.59, 0.68, 0.034, 0.026),
  ].map((mark) => poseMark(mark, pose, "body"));

  const tailBase = pose.tailSide === "right"
    ? [
        curve(5, [0.62, 0.66], [0.72, 0.56], [0.84, 0.55], [0.85, 0.64]),
        curve(5, [0.85, 0.64], [0.82, 0.72], [0.72, 0.74], [0.65, 0.70]),
      ]
    : [
        curve(5, [0.38, 0.66], [0.28, 0.56], [0.16, 0.55], [0.15, 0.64]),
        curve(5, [0.15, 0.64], [0.18, 0.72], [0.28, 0.74], [0.35, 0.70]),
      ];

  return [...head, ...body, ...tailBase.map((mark) => poseMark(mark, pose, "body"))];
}

// 네 종류 모두 얼굴 특징을 머리 안에 묶고, 귀는 머리 바깥에서만 닫는다.
// 단순 좌우 반전이 아니라 귀 모양·고개 방향·꼬리·점 위치가 함께 달라진다.
export const FRIENDLY_DOG_GUIDES: readonly GuideMark[][] = [
  buildDogGuide({ headShift: 0, headTilt: 0, mirror: false, raisedEar: "none", tailSide: "right", spotSide: "left" }),
  buildDogGuide({ headShift: 0, headTilt: 0, mirror: false, raisedEar: "left", tailSide: "left", spotSide: "right" }),
  buildDogGuide({ headShift: -0.008, headTilt: -5, mirror: false, raisedEar: "none", tailSide: "right", spotSide: "right" }),
  buildDogGuide({ headShift: 0.008, headTilt: 5, mirror: true, raisedEar: "right", tailSide: "left", spotSide: "left" }),
];
