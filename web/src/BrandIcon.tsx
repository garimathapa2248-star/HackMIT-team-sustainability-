import plant from "./assets/plant.json";
import StillIcon from "./StillIcon";

/** The RootLedger mark: the Lordicon "growing plant" artwork as a still, fully grown image. */
export default function BrandIcon() {
  return <StillIcon data={plant} className="brand-icon" />;
}
