
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Info, Leaf } from 'lucide-react';

export default function WhatIsThcaPage() {
  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      <header className="text-center space-y-4">
        <Leaf className="h-16 w-16 mx-auto text-primary" />
        <h1 className="text-4xl font-bold font-headline text-primary">Understanding THCa</h1>
        <p className="text-xl text-muted-foreground">
          Learn about Tetrahydrocannabinolic Acid and its role in cannabis.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-accent flex items-center">
            <Info className="mr-3 h-7 w-7" /> What is THCa?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-1">
              <div className="relative aspect-square rounded-lg overflow-hidden shadow-md">
                <Image
                  src="https://placehold.co/400x400.png"
                  alt="Cannabis plant structure"
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint="cannabis plant"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <p>
                THCa, or Tetrahydrocannabinolic Acid, is a non-psychoactive cannabinoid found in raw and live cannabis. As the cannabis plant dries or is heated, THCa slowly converts to THC, the compound known for its psychoactive effects.
              </p>
              <p className="mt-2">
                In its raw form, THCa has a different molecular structure than THC, which prevents it from binding effectively with the CB1 receptors in the brain responsible for producing the "high" associated with cannabis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-accent flex items-center">
            <Info className="mr-3 h-7 w-7" /> THCa vs. THC: The Key Difference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base leading-relaxed">
          <p>
            The primary difference between THCa and THC (Delta-9-Tetrahydrocannabinol) lies in their psychoactive properties and molecular structure.
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <span className="font-semibold">Psychoactivity:</span> THCa is non-psychoactive in its raw state, while THC is psychoactive.
            </li>
            <li>
              <span className="font-semibold">Decarboxylation:</span> THCa converts into THC through a process called decarboxylation, which occurs when cannabis is exposed to heat (like smoking, vaping, or cooking) or over time as it cures. This process removes a carboxyl group (COOH) from the THCa molecule, changing its shape and allowing it to interact with CB1 receptors.
            </li>
          </ul>
          <div className="relative aspect-video w-full md:w-2/3 mx-auto rounded-lg overflow-hidden shadow-md mt-4">
             <Image
                src="https://placehold.co/600x300.png"
                alt="Decarboxylation process diagram"
                fill
                style={{ objectFit: 'cover' }}
                data-ai-hint="science diagram"
                sizes="(max-width: 768px) 100vw, 66vw"
              />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-accent flex items-center">
            <Info className="mr-3 h-7 w-7" /> Potential Reported Benefits of THCa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base leading-relaxed">
          <p>
            While research is ongoing, preliminary studies and anecdotal reports suggest that THCa may offer several potential therapeutic benefits in its non-decarboxylated form. These include:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold text-primary mb-1">Anti-inflammatory Properties</h4>
              <p className="text-sm">THCa has been studied for its potential to reduce inflammation, which could be beneficial for conditions like arthritis or lupus.</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold text-primary mb-1">Neuroprotective Effects</h4>
              <p className="text-sm">Some research indicates THCa might help protect nerve cells, potentially offering benefits for neurodegenerative diseases.</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold text-primary mb-1">Anti-emetic Properties</h4>
              <p className="text-sm">THCa may help reduce nausea and vomiting, similar to THC but without the psychoactive effects.</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold text-primary mb-1">Anti-proliferative Effects</h4>
              <p className="text-sm">Early studies suggest THCa might inhibit the growth of certain types of cancer cells, though much more research is needed.</p>
            </div>
          </div>
          <p className="mt-4">
            It's important to note that these are areas of active research, and THCa is not a substitute for medical treatment.
          </p>
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
            The information provided on this page is for educational purposes only and is not intended as medical advice. The statements made regarding these products have not been evaluated by the Food and Drug Administration.
          </p>
          <p>
            Consult with a healthcare professional before using any cannabis products, especially if you have a medical condition or are taking other medications. Product effects can vary between individuals. Use responsibly and in accordance with local laws and regulations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
