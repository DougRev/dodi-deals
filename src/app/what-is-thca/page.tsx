
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Info, Leaf, Thermometer, ShieldCheck } from 'lucide-react';

export default function WhatIsThcaPage() {
  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      <header className="text-center space-y-4">
        <Leaf className="h-16 w-16 mx-auto text-primary" />
        <h1 className="text-4xl font-bold font-headline text-primary">Understanding THCa</h1>
        <p className="text-xl text-muted-foreground">
          Explore the science and benefits of Tetrahydrocannabinolic Acid.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-accent flex items-center">
            <Info className="mr-3 h-7 w-7" /> What is THCa?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base leading-relaxed">
          <p>
            THCa, or Tetrahydrocannabinolic Acid, is a naturally occurring, non-psychoactive cannabinoid found in raw and live cannabis. Unlike THC (the compound known for producing a “high”), THCa doesn’t bind effectively to CB1 receptors in the brain—meaning it won’t cause intoxication in its natural form.
          </p>
          <p>
            As cannabis is dried, cured, or heated, THCa converts into THC through a chemical reaction known as decarboxylation. This transformation alters the molecular structure by removing a carboxyl group (COOH), enabling it to bind to the brain’s cannabinoid receptors.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-accent flex items-center">
            <Thermometer className="mr-3 h-7 w-7" /> THCa vs. THC: Key Differences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base leading-relaxed">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Feature</TableHead>
                <TableHead>THCa</TableHead>
                <TableHead>THC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Psychoactive</TableCell>
                <TableCell>❌ Non-psychoactive</TableCell>
                <TableCell>✅ Psychoactive</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Found In</TableCell>
                <TableCell>Raw/live cannabis</TableCell>
                <TableCell>Heated/cured cannabis</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Converts To</TableCell>
                <TableCell>THC (via heat/time)</TableCell>
                <TableCell>—</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Interaction with CB1 Receptors</TableCell>
                <TableCell>Minimal</TableCell>
                <TableCell>Strong (induces high)</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="mt-4">
            Decarboxylation is the process by which THCa becomes THC. This occurs through smoking, vaping, baking, or even extended drying/curing.
          </p>
          <div className="mt-6 mb-2 flex justify-center">
            <div className="relative w-full max-w-2xl rounded-lg overflow-hidden shadow-md bg-muted/20 p-2">
              <Image
                src="/images/info/molecules.png"
                alt="THCa to THC Conversion Diagram: THCa molecule in raw cannabis, heat icon, transforming to THC molecule, labeled Decarboxylation"
                width={724} 
                height={272} 
                layout="responsive"
                objectFit="contain"
                data-ai-hint="molecule diagram"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-accent flex items-center">
            <ShieldCheck className="mr-3 h-7 w-7" /> Potential Benefits of THCa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base leading-relaxed">
          <p>
            Though more research is needed, early studies and anecdotal evidence suggest THCa may provide several therapeutic benefits—all without the high of THC:
          </p>
          
          <div className="flex flex-col md:flex-row items-start gap-6 mt-4">
            <div className="w-full md:w-1/3 lg:w-2/5 shrink-0">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md bg-muted/30">
                 <Image
                    src="/images/info/holistic.png"
                    alt="Woman practicing holistic wellness in nature, representing THCa's potential benefits."
                    fill
                    style={{ objectFit: 'cover' }} 
                    data-ai-hint="holistic wellness"
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 33vw, 40vw"
                  />
              </div>
            </div>
            <div className="w-full md:w-2/3 lg:w-3/5 space-y-3">
              <p><span className="text-xl mr-2">🧬</span> <strong>Anti-Inflammatory:</strong> May help reduce inflammation in conditions like arthritis, lupus, and other autoimmune disorders.</p>
              <p><span className="text-xl mr-2">🧠</span> <strong>Neuroprotective:</strong> Shown to possibly protect brain cells and slow progression of neurodegenerative diseases like Parkinson’s or Alzheimer’s.</p>
              <p><span className="text-xl mr-2">🤢</span> <strong>Anti-Emetic:</strong> May ease nausea and vomiting, offering a potential benefit for chemotherapy patients or those with digestive issues.</p>
              <p><span className="text-xl mr-2">🛡️</span> <strong>Anti-Proliferative:</strong> Preliminary studies suggest THCa could inhibit the growth of certain cancer cells, though more clinical research is necessary.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive bg-destructive/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-destructive flex items-center">
            <AlertCircle className="mr-3 h-6 w-6" /> Important Disclaimer
          </CardTitle>
        </CardHeader>
        <CardContent className="text-destructive/90 text-sm space-y-2">
          <p>
            THCa is not a substitute for medical treatment. Always consult a healthcare professional before starting any cannabinoid-based regimen.
          </p>
          <p>
            The information provided on this page is for educational purposes only and is not intended as medical advice. The statements made regarding these products have not been evaluated by the Food and Drug Administration.
          </p>
          <p>
            Product effects can vary between individuals. Use responsibly and in accordance with local laws and regulations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
