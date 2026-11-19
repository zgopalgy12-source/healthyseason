import { Leaf } from "lucide-react";
import Link from "next/link";

export function Brand() {
  return <Link className="brand" href="/">
    <span className="brand-icon"><Leaf size={20} aria-hidden="true" /></span>
    Healthy <span className="accent">Season</span>
  </Link>;
}
