import svgPaths from "./svg-qqp7qv6y5v";
import clsx from "clsx";
import imgImageBurgerRepublic from "figma:asset/0f1f91abae8cd1358b6a0afde7d6a9fb16780e95.png";
import imgImageBurgerRepublicLogo from "figma:asset/9199ef7013f5123661a2eed1ced2b6465036cc16.png";
type BranchesPageProps = {
  additionalClassNames?: string;
};

function BranchesPage({ children, additionalClassNames = "" }: React.PropsWithChildren<BranchesPageProps>) {
  return (
    <div className={clsx("h-[27.987px] relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[7.995px] items-center relative size-full">{children}</div>
    </div>
  );
}
type Wrapper1Props = {
  additionalClassNames?: string;
};

function Wrapper1({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper1Props>) {
  return (
    <div className={additionalClassNames}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">{children}</div>
    </div>
  );
}
type WrapperProps = {
  additionalClassNames?: string;
};

function Wrapper({ children, additionalClassNames = "" }: React.PropsWithChildren<WrapperProps>) {
  return <Wrapper1 additionalClassNames={clsx("relative shrink-0", additionalClassNames)}>{children}</Wrapper1>;
}

function Button({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="bg-white h-[59.986px] relative rounded-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[19.992px] py-0 relative size-full">{children}</div>
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[19.992px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.9923 19.9923">
        <g id="Icon">
          <path d={svgPaths.p14a7a3c0} id="Vector" stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66602" />
          <path d={svgPaths.p3832f3a0} id="Vector_2" stroke="var(--stroke-0, #99A1AF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66602" />
        </g>
      </svg>
    </div>
  );
}
type TextText1Props = {
  text: string;
};

function TextText1({ text }: TextText1Props) {
  return (
    <Wrapper additionalClassNames="h-[23.994px] w-[7.233px]">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[24px] left-0 not-italic text-[#99a1af] text-[16px] text-nowrap top-[-0.68px] tracking-[-0.3125px]">{text}</p>
    </Wrapper>
  );
}
type TextTextProps = {
  text: string;
  additionalClassNames?: string;
};

function TextText({ text, additionalClassNames = "" }: TextTextProps) {
  return (
    <Wrapper1 additionalClassNames={clsx("h-[27.987px] relative shrink-0", additionalClassNames)}>
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[18px] text-black text-nowrap top-[-0.1px] tracking-[-0.4395px]">{text}</p>
    </Wrapper1>
  );
}
type VectorProps = {
  additionalClassNames?: string;
};

function Vector({ additionalClassNames = "" }: VectorProps) {
  return (
    <div className={clsx("absolute", additionalClassNames)}>
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="Vector"></g>
      </svg>
    </div>
  );
}

export default function ConvertDesignToPrototype() {
  return (
    <div className="bg-white relative size-full" data-name="Convert Design to Prototype">
      <div className="absolute bg-white h-[852.617px] left-0 top-0 w-[393.784px]" data-name="Header">
        <div className="absolute h-[299.993px] left-0 overflow-clip top-0 w-[393.784px]" data-name="Container">
          <div className="absolute h-[299.993px] left-0 top-0 w-[393.784px]" data-name="Image (Burger Republic)">
            <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgImageBurgerRepublic} />
          </div>
          <div className="absolute bg-gradient-to-b from-1/2 h-[299.993px] left-0 to-[#e7000b] top-0 w-[393.784px]" data-name="Container" />
        </div>
        <div className="absolute content-stretch flex flex-col gap-[31.999px] h-[553.441px] items-center left-0 pb-[15.999px] pt-0 px-0 top-[172px] w-[393.784px]" data-name="Container">
          <div className="bg-[rgba(255,255,255,0)] relative rounded-[1.94885e+07px] shrink-0 size-[249.999px]" data-name="Container">
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip p-[5.808px] relative rounded-[inherit] size-full">
              <div className="h-[238.383px] relative shrink-0 w-full" data-name="Image (Burger Republic Logo)">
                <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgImageBurgerRepublicLogo} />
              </div>
            </div>
            <div aria-hidden="true" className="absolute border-[5.808px] border-solid border-white inset-0 pointer-events-none rounded-[1.94885e+07px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]" />
          </div>
          <div className="bg-white h-[255.444px] relative rounded-[16px] shrink-0 w-[361.785px]" data-name="Container">
            <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[23.994px] items-start pb-0 pt-[23.994px] px-[23.994px] relative size-full">
              <div className="content-stretch flex flex-col h-[63.997px] items-start relative shrink-0 w-full" data-name="Container">
                <div className="h-[31.999px] relative shrink-0 w-full" data-name="Paragraph">
                  <p className="absolute font-['Poppins:Regular',sans-serif] leading-[32px] left-[157.78px] not-italic text-[16px] text-black text-center text-nowrap top-[0.65px] translate-x-[-50%]">☎️ 15879</p>
                </div>
                <div className="h-[31.999px] relative shrink-0 w-full" data-name="Paragraph">
                  <p className="absolute font-['Poppins:Regular',sans-serif] leading-[32px] left-[157.32px] not-italic text-[16px] text-black text-center text-nowrap top-[0.65px] translate-x-[-50%]">🚩 Your Burger Destination</p>
                </div>
              </div>
              <div className="h-[47.989px] relative shrink-0 w-full" data-name="Container">
                <div className="absolute bg-[#f2f2f2] content-stretch flex flex-col items-start left-[42.92px] pb-0 pt-[11.997px] px-[11.997px] rounded-[1.94885e+07px] size-[47.989px] top-0" data-name="Button">
                  <div className="content-stretch flex flex-col h-[23.994px] items-start relative shrink-0 w-full" data-name="Container">
                    <div className="h-[23.994px] overflow-clip relative shrink-0 w-full" data-name="Icon">
                      <Vector additionalClassNames="inset-[0_22.73%]" />
                    </div>
                  </div>
                </div>
                <div className="absolute bg-[#f2f2f2] content-stretch flex flex-col items-start left-[102.91px] pb-0 pt-[11.997px] px-[11.997px] rounded-[1.94885e+07px] size-[47.989px] top-0" data-name="Button">
                  <div className="content-stretch flex flex-col h-[23.994px] items-start relative shrink-0 w-full" data-name="Container">
                    <div className="h-[23.994px] overflow-clip relative shrink-0 w-full" data-name="Icon">
                      <Vector additionalClassNames="inset-[0_6.69%]" />
                    </div>
                  </div>
                </div>
                <div className="absolute bg-[#f2f2f2] content-stretch flex flex-col items-start left-[162.9px] pb-0 pt-[11.997px] px-[11.997px] rounded-[1.94885e+07px] size-[47.989px] top-0" data-name="Button">
                  <div className="content-stretch flex flex-col h-[23.994px] items-start relative shrink-0 w-full" data-name="Container">
                    <div className="h-[23.994px] overflow-clip relative shrink-0 w-full" data-name="Icon">
                      <Vector additionalClassNames="inset-[0_0.01%]" />
                    </div>
                  </div>
                </div>
                <div className="absolute bg-[#f2f2f2] content-stretch flex flex-col items-start left-[222.88px] pb-0 pt-[11.997px] px-[11.997px] rounded-[1.94885e+07px] size-[47.989px] top-0" data-name="Button">
                  <div className="content-stretch flex flex-col h-[23.994px] items-start relative shrink-0 w-full" data-name="Container">
                    <div className="h-[23.994px] overflow-clip relative shrink-0 w-full" data-name="Icon">
                      <Vector additionalClassNames="inset-[0_11.3%]" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white h-[47.481px] relative rounded-[1.94885e+07px] shrink-0 w-full" data-name="Button">
                <div aria-hidden="true" className="absolute border-[#e7e7e7] border-[1.742px] border-solid inset-0 pointer-events-none rounded-[1.94885e+07px]" />
                <div className="absolute left-[98px] size-[15.999px] top-[15.74px]" data-name="Icon">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15.9993 15.9993">
                    <g clipPath="url(#clip0_1_644)" id="Icon">
                      <path d={svgPaths.p1a19b800} id="Vector" stroke="var(--stroke-0, #18181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33327" />
                      <path d={svgPaths.p30470800} id="Vector_2" stroke="var(--stroke-0, #18181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33327" />
                    </g>
                    <defs>
                      <clipPath id="clip0_1_644">
                        <rect fill="white" height="15.9993" width="15.9993" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-[169px] not-italic text-[#18181b] text-[14px] text-center text-nowrap top-[14.48px] tracking-[-0.1504px] translate-x-[-50%]">Our Branches</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bg-[#e7000b] content-stretch flex flex-col h-[43.996px] items-start left-0 pb-0 pt-[11.997px] px-[15.999px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-[808.62px] w-[393.784px]" data-name="Container">
        <div className="h-[20.001px] relative shrink-0 w-full" data-name="StickyBanner">
          <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] left-[181.04px] not-italic text-[14px] text-center text-nowrap text-white top-[0.74px] tracking-[-0.1504px] translate-x-[-50%]">👀 View Only Menu - Please order with the waiter</p>
        </div>
      </div>
      <div className="absolute bg-[#f5f5f5] content-stretch flex flex-col h-[852.617px] items-start left-0 overflow-clip top-0 w-[393.784px]" data-name="Container">
        <div className="bg-white h-[71.983px] relative shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full" data-name="BranchesPage">
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex gap-[15.999px] items-center pl-[15.999px] pr-0 py-0 relative size-full">
              <div className="relative rounded-[1.94885e+07px] shrink-0 size-[39.985px]" data-name="Button">
                <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pb-0 pt-[7.995px] px-[7.995px] relative size-full">
                  <div className="h-[23.994px] overflow-clip relative shrink-0 w-full" data-name="Icon">
                    <div className="absolute bottom-[20.83%] left-[20.83%] right-1/2 top-[20.83%]" data-name="Vector">
                      <div className="absolute inset-[-7.14%_-14.29%]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8.99789 15.9963">
                          <path d={svgPaths.p2eea7b00} id="Vector" stroke="var(--stroke-0, #18181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99953" />
                        </svg>
                      </div>
                    </div>
                    <div className="absolute bottom-1/2 left-[20.83%] right-[20.83%] top-1/2" data-name="Vector">
                      <div className="absolute inset-[-1px_-7.14%]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15.9963 1.99953">
                          <path d="M14.9965 0.999766H0.999766" id="Vector" stroke="var(--stroke-0, #18181B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99953" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Wrapper additionalClassNames="h-[36.001px] w-[203.39px]">
                <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[36px] left-0 not-italic text-[#18181b] text-[32px] text-nowrap top-[-0.16px] tracking-[0.4063px]">Our Branches</p>
              </Wrapper>
            </div>
          </div>
        </div>
        <div className="h-[827.806px] relative shrink-0 w-full" data-name="BranchesPage">
          <div className="content-stretch flex flex-col gap-[11.997px] items-start pb-0 pt-[23.994px] px-[15.999px] relative size-full">
            <Button>
              <BranchesPage additionalClassNames="w-[272.097px]">
                <TextText text="Hadayek El Kobba" additionalClassNames="w-[144.865px]" />
                <TextText1 text="-" />
                <Wrapper additionalClassNames="h-[27.987px] w-[104.009px]">
                  <p className="absolute font-['Inter:Regular','Noto_Sans_Arabic:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#18181b] text-[18px] top-[-0.1px] tracking-[-0.4395px] w-[105px]" dir="auto">
                    🚩 حدائق القبة
                  </p>
                </Wrapper>
              </BranchesPage>
              <Icon />
            </Button>
            <Button>
              <BranchesPage additionalClassNames="w-[191.701px]">
                <TextText text="Nasr City" additionalClassNames="w-[73.907px]" />
                <TextText1 text="-" />
                <Wrapper additionalClassNames="h-[27.987px] w-[94.571px]">
                  <p className="absolute font-['Inter:Regular','Noto_Sans_Arabic:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#18181b] text-[18px] top-[-0.1px] tracking-[-0.4395px] w-[95px]" dir="auto">
                    🚩 مدينة نصر
                  </p>
                </Wrapper>
              </BranchesPage>
              <Icon />
            </Button>
            <Button>
              <BranchesPage additionalClassNames="w-[216.911px]">
                <TextText text="Heliopolis" additionalClassNames="w-[78.49px]" />
                <TextText1 text="-" />
                <Wrapper additionalClassNames="h-[27.987px] w-[115.198px]">
                  <p className="absolute font-['Inter:Regular','Noto_Sans_Arabic:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#18181b] text-[18px] top-[-0.1px] tracking-[-0.4395px] w-[116px]" dir="auto">
                    🚩 مصر الجديدة
                  </p>
                </Wrapper>
              </BranchesPage>
              <Icon />
            </Button>
            <Button>
              <BranchesPage additionalClassNames="w-[150.881px]">
                <TextText text="Maadi" additionalClassNames="w-[48.678px]" />
                <TextText1 text="-" />
                <Wrapper additionalClassNames="h-[27.987px] w-[78.98px]">
                  <p className="absolute font-['Inter:Regular','Noto_Sans_Arabic:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#18181b] text-[18px] top-[-0.1px] tracking-[-0.4395px] w-[79px]" dir="auto">
                    🚩 المعادي
                  </p>
                </Wrapper>
              </BranchesPage>
              <Icon />
            </Button>
            <Button>
              <BranchesPage additionalClassNames="w-[171.2px]">
                <TextText text="Gardenia" additionalClassNames="w-[72.301px]" />
                <TextText1 text="-" />
                <Wrapper additionalClassNames="h-[27.987px] w-[75.677px]">
                  <p className="absolute font-['Inter:Regular','Noto_Sans_Arabic:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#18181b] text-[18px] top-[-0.1px] tracking-[-0.4395px] w-[76px]" dir="auto">
                    🚩 جاردينيا
                  </p>
                </Wrapper>
              </BranchesPage>
              <Icon />
            </Button>
            <Button>
              <BranchesPage additionalClassNames="w-[215.133px]">
                <TextText text="New Cairo" additionalClassNames="w-[82.764px]" />
                <TextText1 text="-" />
                <Wrapper additionalClassNames="h-[27.987px] w-[109.145px]">
                  <p className="absolute font-['Inter:Regular','Noto_Sans_Arabic:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#18181b] text-[18px] top-[-0.1px] tracking-[-0.4395px] w-[110px]" dir="auto">
                    🚩 التجمع الأول
                  </p>
                </Wrapper>
              </BranchesPage>
              <Icon />
            </Button>
            <Button>
              <BranchesPage additionalClassNames="w-[192.481px]">
                <TextText text="Al Obour City" additionalClassNames="w-[107.067px]" />
                <TextText1 text="-" />
                <Wrapper additionalClassNames="h-[27.987px] w-[62.191px]">
                  <p className="absolute font-['Inter:Regular','Noto_Sans_Arabic:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#18181b] text-[18px] top-[-0.1px] tracking-[-0.4395px] w-[63px]" dir="auto">
                    🚩 العبور
                  </p>
                </Wrapper>
              </BranchesPage>
              <Icon />
            </Button>
            <Button>
              <BranchesPage additionalClassNames="w-[133.421px]">
                <TextText text="Haram" additionalClassNames="w-[53.289px]" />
                <TextText1 text="-" />
                <Wrapper additionalClassNames="h-[27.987px] w-[56.91px]">
                  <p className="absolute font-['Inter:Regular','Noto_Sans_Arabic:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#18181b] text-[18px] top-[-0.1px] tracking-[-0.4395px] w-[57px]" dir="auto">
                    🚩 الهرم
                  </p>
                </Wrapper>
              </BranchesPage>
              <Icon />
            </Button>
            <Button>
              <BranchesPage additionalClassNames="w-[137.323px]">
                <TextText text="Faysal" additionalClassNames="w-[49.822px]" />
                <TextText1 text="-" />
                <Wrapper additionalClassNames="h-[27.987px] w-[64.278px]">
                  <p className="absolute font-['Inter:Regular','Noto_Sans_Arabic:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#18181b] text-[18px] top-[-0.1px] tracking-[-0.4395px] w-[65px]" dir="auto">
                    🚩 فيصل
                  </p>
                </Wrapper>
              </BranchesPage>
              <Icon />
            </Button>
            <Button>
              <BranchesPage additionalClassNames="w-[231.123px]">
                <TextText text="Mall of Arabia" additionalClassNames="w-[109.563px]" />
                <TextText1 text="-" />
                <Wrapper additionalClassNames="h-[27.987px] w-[98.337px]">
                  <p className="absolute font-['Inter:Regular','Noto_Sans_Arabic:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#18181b] text-[18px] top-[-0.1px] tracking-[-0.4395px] w-[99px]" dir="auto">
                    🚩 مول العرب
                  </p>
                </Wrapper>
              </BranchesPage>
              <Icon />
            </Button>
            <Button>
              <BranchesPage additionalClassNames="w-[202.319px]">
                <TextText text="Alexandria" additionalClassNames="w-[83.935px]" />
                <TextText1 text="-" />
                <Wrapper additionalClassNames="h-[27.987px] w-[95.161px]">
                  <p className="absolute font-['Inter:Regular','Noto_Sans_Arabic:Regular',sans-serif] font-normal leading-[28px] left-0 not-italic text-[#18181b] text-[18px] top-[-0.1px] tracking-[-0.4395px] w-[96px]" dir="auto">
                    🚩 الإسكندرية
                  </p>
                </Wrapper>
              </BranchesPage>
              <Icon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}