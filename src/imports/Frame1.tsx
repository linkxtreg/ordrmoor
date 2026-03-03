import svgPaths from "./svg-fz31538chg";
import imgImageBurgerRepublic from "figma:asset/0f1f91abae8cd1358b6a0afde7d6a9fb16780e95.png";
import imgImageBurgerRepublicLogo from "figma:asset/9199ef7013f5123661a2eed1ced2b6465036cc16.png";

export default function Frame() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start pb-[130px] pt-0 px-0 relative size-full">
      <div className="h-[298.098px] mb-[-130px] overflow-clip relative shrink-0 w-full" data-name="Container">
        <div className="absolute h-[298.098px] left-0 top-0 w-[375.447px]" data-name="Image (Burger Republic)">
          <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgImageBurgerRepublic} />
        </div>
        <div className="absolute bg-gradient-to-b from-[49.984%] from-[rgba(231,0,11,0)] h-[298.098px] left-0 to-[#e7000b] to-[109.19%] top-0 w-[375.447px]" data-name="Container" />
      </div>
      <div className="content-stretch flex flex-col gap-[32px] items-center mb-[-130px] pb-[40px] pt-0 px-0 relative shrink-0 w-full" data-name="Container">
        <div className="h-[256.667px] pointer-events-none relative rounded-[252.187px] shrink-0 w-[250px]" data-name="Image (Burger Republic Logo)">
          <div aria-hidden="true" className="absolute inset-0 rounded-[252.187px]">
            <div className="absolute bg-[rgba(255,255,255,0)] inset-0 rounded-[252.187px]" />
            <img alt="" className="absolute max-w-none object-50%-50% object-cover rounded-[252.187px] size-full" src={imgImageBurgerRepublicLogo} />
          </div>
          <div aria-hidden="true" className="absolute border-[6.004px] border-solid border-white inset-[-6.004px] rounded-[258.191px]" />
        </div>
        <div className="bg-white content-stretch flex flex-col items-start relative shrink-0 w-full">
          <div className="content-stretch flex flex-col gap-[30px] items-start relative shrink-0 w-full">
            <div className="content-stretch flex items-center justify-center relative shrink-0 w-full" data-name="Bio">
              <div className="basis-0 font-['Poppins:SemiBold',sans-serif] grow leading-[2] min-h-px min-w-px not-italic relative shrink-0 text-[16px] text-black text-center">
                <p className="mb-0" dir="auto">
                  ☎️ 15879
                </p>
                <p dir="auto">{` 🚩 Your Burger Destination `}</p>
              </div>
            </div>
            <div className="content-center flex flex-wrap gap-[10px] items-center justify-center relative shrink-0 w-full" data-name="Social Media">
              <div className="bg-[#f2f2f2] content-stretch flex items-center justify-center p-[10px] relative rounded-[40px] shrink-0" data-name="Big-Buttun">
                <div className="content-stretch flex items-center justify-center relative shrink-0 size-[22px]" data-name="Component 1">
                  <div className="h-[22px] relative shrink-0 w-[12px]" data-name="Group">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 22">
                      <g id="Group">
                        <path d={svgPaths.p1471f500} fill="var(--fill-0, black)" id="Vector" />
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-[#f2f2f2] content-stretch flex items-center justify-center p-[10px] relative rounded-[40px] shrink-0" data-name="Big-Buttun">
                <div className="content-stretch flex items-center justify-center relative shrink-0 size-[22px]" data-name="Component 1">
                  <div className="h-[22px] relative shrink-0 w-[19.055px]" data-name="Group">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.0551 22">
                      <g id="Group">
                        <path d={svgPaths.p3f778580} fill="var(--fill-0, black)" id="Vector" />
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-[#f2f2f2] content-stretch flex items-center justify-center p-[10px] relative rounded-[40px] shrink-0" data-name="Big-Buttun">
                <div className="content-stretch flex items-center justify-center relative shrink-0 size-[22px]" data-name="Component 1">
                  <div className="h-[22px] relative shrink-0 w-[21.995px]" data-name="Group">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 21.9948 22">
                      <g id="Group">
                        <path d={svgPaths.p30c89400} fill="var(--fill-0, black)" id="Vector" />
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-[#f2f2f2] content-stretch flex items-center justify-center p-[10px] relative rounded-[40px] shrink-0" data-name="Big-Buttun">
                <div className="content-stretch flex items-center justify-center relative shrink-0 size-[22px]" data-name="Component 1">
                  <div className="h-[22px] relative shrink-0 w-[17.029px]" data-name="Group">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.0293 22">
                      <g id="Group">
                        <path clipRule="evenodd" d={svgPaths.p3a1590f0} fill="var(--fill-0, black)" fillRule="evenodd" id="Vector" />
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}