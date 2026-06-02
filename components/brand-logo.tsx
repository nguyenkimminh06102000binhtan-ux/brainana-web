import Image from "next/image";
import type { ReactNode } from "react";

type BrandIconProps = {
  className?: string;
  priority?: boolean;
};

type BrandLogoProps = BrandIconProps & {
  label?: ReactNode;
  labelClassName?: string;
};

type BrandDomainWordmarkProps = {
  className?: string;
};

const wordmarkOutline = {
  WebkitTextStroke: "1.25px #19244E",
  textShadow: "1.5px 1.5px 0 #19244E",
};

export function BrandIcon({ className = "h-10 w-12", priority = false }: BrandIconProps) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-visible ${className}`}>
      <Image
        src="/logos/brainana-mascot-512.png"
        alt=""
        width={512}
        height={412}
        priority={priority}
        className="h-full w-full object-contain drop-shadow-sm"
      />
    </span>
  );
}

export function BrandLogo({
  className = "h-10 w-12",
  label = "brainana.app",
  labelClassName = "",
  priority = false,
}: BrandLogoProps) {
  const renderedLabel = typeof label === "string"
    ? label.toLowerCase() === "brainana" || label.toLowerCase() === "brainana.app"
      ? <BrandDomainWordmark />
      : <BrandNameWordmark label={label} />
    : label;

  return (
    <>
      <BrandIcon className={className} priority={priority} />
      <span className={labelClassName}>{renderedLabel}</span>
    </>
  );
}

export function BrandNameWordmark({ className = "", label = "Brainana" }: BrandDomainWordmarkProps & { label?: string }) {
  return (
    <span
      className={`inline-flex items-baseline font-fredoka text-[1.45rem] font-[800] leading-none tracking-normal text-[#F36B4A] ${className}`}
      style={wordmarkOutline}
    >
      {label}
    </span>
  );
}

export function BrandDomainWordmark({ className = "" }: BrandDomainWordmarkProps) {
  return (
    <span
      className={`inline-flex items-baseline font-fredoka text-[1.45rem] font-[800] leading-none tracking-normal ${className}`}
      aria-label="brainana.app"
    >
      <span className="text-[#F36B4A]" style={wordmarkOutline}>brainana</span>
      <span className="ml-0.5 text-[#F5C842]" style={wordmarkOutline}>.app</span>
    </span>
  );
}
