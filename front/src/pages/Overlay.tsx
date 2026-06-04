import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { Donation } from "../types/donation";
import "./OverlayPage.css";

const socket = io("http://localhost:3000");

export default function OverlayPage() {
    const [donation, setDonation] =
        useState<Donation | null>(null);

    const [visible, setVisible] = useState(false);

    useEffect(() => {
        socket.on("donationPaid", (data: Donation) => {
            setDonation(data);

            setVisible(true);

            setTimeout(() => {
                setVisible(false);
                setDonation(null);
            }, 5000);
        });

        return () => {
            socket.off("donationPaid");
        };
    }, []);

    if (!visible || !donation) {
        return null;
    }

    return (
        <div className="overlay">
            <h1>
                🎉 {donation.name}
            </h1>

            <h2>
                {donation.amount} บาท
            </h2>

            <p>
                {donation.message}
            </p>
        </div>
    );
}