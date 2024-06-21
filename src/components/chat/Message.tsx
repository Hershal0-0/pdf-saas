import { cn } from "@/lib/utils";
import React from "react";

interface MessageProps {
  isUserMessage: boolean;
}
const Message = ({ isUserMessage }: MessageProps) => {
  return <div className={cn("flex items-end")}></div>;
};

export default Message;
