"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useToast } from "../ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import FileUpload from "../file-upload";
import { NFT_ENDPOINT, NFT_STORAGE_TOKEN } from "@/lib/ipfs";

const formSchema = z.object({
  title: z.string().min(3),
  image: z.custom(
    (value) => {
      // Check if File is available (browser environment)
      if (typeof File !== "undefined" && value instanceof File) {
        return true; // Valid File instance
      } else {
        return false; // Not a valid File instance
      }
    },
    {
      message: "Select the image",
    }
  ),
});

const CreatePostModal = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const handleOnOpenChange = (open: boolean) => {
    if (!open) {
      router.back();
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      const selectedImage = event.target.files[0];
      form.setValue("image", selectedImage);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);

      if (values.image == null) {
        form.setError("image", {
          message: "Select Image",
        });
        return;
      }

      const i = await values.image.arrayBuffer();

      const res = await fetch(`${NFT_ENDPOINT}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NFT_STORAGE_TOKEN}`,
          "content-type": "images/*",
        },
        body: i,
      });

      const data = await res.json();

      if (res.status != 200) throw new Error(data.error.message);

      const cid = data.value.cid;
      const size = data.value.size;

      const saveRes = await fetch("/api/mint", {
        method: "POST",
        body: JSON.stringify({
          title: values.title,
          cid: cid,
          size: size,
        }),
      });

      const savedData = await saveRes.json();
      if (res.status !== 200) throw new Error(savedData.message);
      toast({
        title: `Success: ${savedData.message}`,
        description: "Minted but it will take some time to sync.",
      });
      router.back();
    } catch (error: any) {
      toast({
        title: "Error: Minting Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mint new</DialogTitle>
          <DialogDescription>
            <div className="p-2">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-8"
                >
                  <FormField
                    disabled={loading}
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <FileUpload
                            onChange={field.onChange}
                            value={field.value}
                          >
                            <Input
                              type="file"
                              accept="image/*"
                              className="w-min"
                              multiple={false}
                              onChange={handleImageChange}
                            />
                          </FileUpload>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    disabled={loading}
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="title" {...field} />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button disabled={loading} type="submit">
                    {loading ? "Minting..." : "Mint now"}
                  </Button>
                </form>
              </Form>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
