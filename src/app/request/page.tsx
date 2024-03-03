"use client";

import { useStorage } from "@thirdweb-dev/react";
import init, { decrypt } from "../../../public/rabe/rabe_wasm";
import wasmUrl from "../../../wasm_config";
import { useContext, useEffect, useState } from "react";
import { EthersContext } from "@/contexts/ethers";
import { ethDecrypt, signMessage } from "@/utils/metamask";
import { generateEncryptedSecretKey } from "@/utils/secretKeyGeneration";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BigNumber, ethers } from "ethers";
import AttributeTokenContract from "../../contracts/AttributeToken.json";

const Page = () => {
  const attributeTokenAddress = process.env.NEXT_PUBLIC_ATTRIBUTE_ADDRESS || "";

  const storage = useStorage();
  const { metaMaskAddresss, metaMaskPk, signer } = useContext(EthersContext);

  const [ipfsUri, setIpfsUri] = useState<string>("");
  const [secretKey, mySecretKey] = useState<string>("");
  const [decryptedIpfs, setDecryptedIpfs] = useState("");

  useEffect(() => {
    const getAndDecryptSecretKey = async () => {
      const { hashedMessage, v, r, s } = await signMessage(
        metaMaskAddresss,
        metaMaskAddresss
      );

      const contract = new ethers.Contract(
        attributeTokenAddress,
        AttributeTokenContract.abi,
        signer
      );

      const attributes = await contract.generateAttributeList(
        metaMaskAddresss,
        hashedMessage,
        v,
        r,
        s
      );
      const attributeNumber: string[] = attributes.map((attr: BigNumber) => {
        return `${Number(attr)}`;
      });

      console.log("Transaction successful:", attributeNumber);
      const data = await generateEncryptedSecretKey(
        attributeNumber,
        metaMaskPk!
      );
      const encryptedSk = data["encryptedSk"];
      const decryptedSk = await ethDecrypt(metaMaskAddresss, encryptedSk);
      return decryptedSk;
    };

    getAndDecryptSecretKey()
      .then((secretKey) => {
        mySecretKey(secretKey);
      })
      .catch(console.error);
  }, [attributeTokenAddress, metaMaskAddresss, metaMaskPk, signer]);

  const handleDecrypt = async () => {
    if (ipfsUri) {
      const ipfsDownload = await storage?.download(ipfsUri);
      const result = await fetch(ipfsDownload!.url);
      const IpfsCipherText = await result.text();
      return await init(wasmUrl).then(() => {
        const result = decrypt(secretKey, IpfsCipherText);
        const decryptedIpfs = new TextDecoder().decode(result);
        setDecryptedIpfs(decryptedIpfs);
      });
    }
  };

  return (
    <div className="h-[95vh] flex flex-col items-center justify-center gap-2">
      <div className="flex w-1/3">
        <Input
          value={ipfsUri}
          onChange={(event) => setIpfsUri(event.target.value)}
        ></Input>
        <Button onClick={handleDecrypt}>Download Data</Button>
      </div>
      {decryptedIpfs !== "" && <div>{decryptedIpfs}</div>}
    </div>
  );
};

export default Page;
